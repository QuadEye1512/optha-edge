import { runBinaryInference, runSeverityInference } from '@/lib/inference';
import { detectImageContentType, declaredTypeMatchesContent } from '@/lib/imageFileSignature';
import { InvalidModelOutputError } from '@/lib/outputDecoding';
import type { ApiResponse, PredictionErrorCode, PredictionMode } from '@/types/prediction';
import sharp from 'sharp';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;

function errorResponse(code: PredictionErrorCode, message: string, status: number): Response {
  return Response.json(
    { success: false, error: { code, message } } satisfies ApiResponse,
    { status },
  );
}

function isPredictionMode(value: FormDataEntryValue | null): value is PredictionMode {
  return value === 'binary' || value === 'severity';
}

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse('INVALID_FORM_DATA', 'Request body must be valid multipart form data.', 400);
  }

  const imageEntry = formData.get('image');
  const modeEntry = formData.get('mode');

  if (!(imageEntry instanceof File)) {
    return errorResponse('MISSING_IMAGE', 'Provide one image file using the "image" field.', 400);
  }

  if (!isPredictionMode(modeEntry)) {
    return errorResponse('INVALID_MODE', 'Mode must be either "binary" or "severity".', 400);
  }

  if (imageEntry.size === 0) {
    return errorResponse('EMPTY_FILE', 'The uploaded image is empty.', 400);
  }

  if (imageEntry.size > MAX_FILE_SIZE) {
    return errorResponse('FILE_TOO_LARGE', 'The image exceeds the 10 MB upload limit.', 413);
  }

  const buffer = Buffer.from(await imageEntry.arrayBuffer());
  const detectedType = detectImageContentType(buffer);

  if (!detectedType) {
    return errorResponse(
      'UNSUPPORTED_IMAGE_CONTENT',
      'The file content is not a supported JPEG or PNG image.',
      415,
    );
  }

  if (!declaredTypeMatchesContent(imageEntry.type, detectedType)) {
    return errorResponse(
      'MIME_CONTENT_MISMATCH',
      'The declared file type does not match the image content.',
      400,
    );
  }

  try {
    const metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!metadata.width || !metadata.height) {
      return errorResponse('CORRUPT_IMAGE', 'The image dimensions could not be read.', 400);
    }

    if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
      return errorResponse(
        'IMAGE_DIMENSIONS_TOO_LARGE',
        'The image dimensions exceed the safe processing limit.',
        413,
      );
    }
  } catch {
    return errorResponse('CORRUPT_IMAGE', 'The image is corrupt or cannot be decoded.', 400);
  }

  try {
    const result = modeEntry === 'binary'
      ? await runBinaryInference(buffer)
      : await runSeverityInference(buffer);

    return Response.json({ success: true, result } satisfies ApiResponse);
  } catch (error) {
    console.error('[OpthaEdge] Prediction error:', error);

    if (error instanceof InvalidModelOutputError) {
      return errorResponse(
        'MODEL_OUTPUT_INVALID',
        'The model returned an invalid output. No screening result was produced.',
        503,
      );
    }

    return errorResponse(
      'INFERENCE_FAILED',
      'Screening could not be completed. No result was produced.',
      500,
    );
  }
}
