import sharp from 'sharp';
import { ConsentRequiredError, recordScreening } from '@/data/examinations';
import { PatientNotFoundError } from '@/data/patients';
import { Laterality } from '@/generated/prisma/client';
import { getCurrentActor } from '@/lib/auth/authorization';
import { AuthorizationError } from '@/lib/auth/policy';
import { captureOnEdge, EdgeUnavailableError, LocalUnavailableError, predictAdaptive } from '@/lib/edge/client';
import { InvalidEdgeResponseError, type EdgeResult } from '@/lib/edge/schema';
import { declaredTypeMatchesContent, detectImageContentType } from '@/lib/imageFileSignature';
import { StorageKeyError } from '@/lib/storage/crypto';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;

export interface ScreeningApiResponse {
  ok: boolean;
  examinationId?: string;
  gradable?: boolean;
  message?: string;
  backend?: 'edge' | 'local';
  quality?: { sharpness: number; brightness: number; reasons: string[] };
}

function reply(body: ScreeningApiResponse, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request): Promise<Response> {
  const actor = await getCurrentActor();
  if (!actor) return reply({ ok: false, message: 'Your session has expired. Sign in again.' }, 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply({ ok: false, message: 'The request must be multipart form data.' }, 400);
  }

  const patientId = String(form.get('patientId') ?? '');
  const eye = form.get('eye');
  const source = form.get('source');
  if (!patientId) return reply({ ok: false, message: 'Select a patient.' }, 400);
  if (eye !== Laterality.LEFT && eye !== Laterality.RIGHT) return reply({ ok: false, message: 'Select which eye was imaged.' }, 400);
  if (source !== 'upload' && source !== 'pi-camera') return reply({ ok: false, message: 'Choose an image source.' }, 400);

  try {
    let original: { data: Buffer; mimeType: string; width: number; height: number };
    let result: EdgeResult;
    let usedBackend: 'edge' | 'local' = 'edge';

    if (source === 'upload') {
      const file = form.get('image');
      if (!(file instanceof File) || file.size === 0) return reply({ ok: false, message: 'Attach a retinal image.' }, 400);
      if (file.size > MAX_FILE_SIZE) return reply({ ok: false, message: 'The image exceeds the 15 MB limit.' }, 413);
      const data = Buffer.from(await file.arrayBuffer());
      const detected = detectImageContentType(data);
      if (!detected) return reply({ ok: false, message: 'Only JPEG or PNG images are supported. On iPhone, choose "Most Compatible" camera format.' }, 415);
      if (file.type && !declaredTypeMatchesContent(file.type, detected)) {
        return reply({ ok: false, message: 'The file type does not match its content.' }, 400);
      }
      let metadata: sharp.Metadata;
      try {
        metadata = await sharp(data, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
      } catch {
        return reply({ ok: false, message: 'The image is corrupt or cannot be decoded.' }, 400);
      }
      if (!metadata.width || !metadata.height) return reply({ ok: false, message: 'The image dimensions could not be read.' }, 400);
      original = { data, mimeType: detected, width: metadata.width, height: metadata.height };

      const adaptive = await predictAdaptive(data, `capture.${detected === 'image/png' ? 'png' : 'jpg'}`, detected);
      result = adaptive.result;
      usedBackend = adaptive.backend;
    } else {
      result = await captureOnEdge();
      usedBackend = 'edge';
      if (!result.captured_jpeg) throw new InvalidEdgeResponseError('captured image missing');
      original = {
        data: Buffer.from(result.captured_jpeg, 'base64'),
        mimeType: 'image/jpeg',
        width: result.image_width,
        height: result.image_height,
      };
    }

    const captureDevice = usedBackend === 'edge'
      ? (source === 'pi-camera' ? `Raspberry Pi camera + 20D lens (${result.model_file})` : `Uploaded image → Raspberry Pi (${result.model_file})`)
      : `Uploaded image → Laptop processing (${result.model_file})`;

    const { examinationId } = await recordScreening(actor, { patientId, eye, source, captureDevice, original, result });

    return reply({
      ok: true,
      examinationId,
      gradable: result.gradable,
      backend: usedBackend,
      message: result.gradable ? undefined : result.message,
      quality: { sharpness: result.quality.sharpness, brightness: result.quality.brightness, reasons: result.quality.reasons },
    });
  } catch (error) {
    if (error instanceof EdgeUnavailableError) {
      if (source === 'pi-camera') {
        return reply({
          ok: false,
          message: 'The Raspberry Pi camera is unavailable because the edge device is not connected. Connect the Raspberry Pi or select "Phone / upload" to screen using your laptop.',
        }, 503);
      }
      return reply({ ok: false, message: `${error.message.replace(/\.?$/, '.')} No result was produced.` }, error.status);
    }
    if (error instanceof LocalUnavailableError) {
      return reply({ ok: false, message: `Local inference unavailable: ${error.message}` }, 503);
    }
    if (error instanceof InvalidEdgeResponseError) {
      console.error('[OpthaEdge]', error.message);
      return reply({ ok: false, message: 'The inference model returned an invalid result. No result was stored.' }, 502);
    }
    if (error instanceof ConsentRequiredError || error instanceof PatientNotFoundError) {
      return reply({ ok: false, message: error.message }, 403);
    }
    if (error instanceof AuthorizationError) {
      return reply({ ok: false, message: 'Your role cannot run screenings.' }, 403);
    }
    if (error instanceof StorageKeyError) {
      return reply({ ok: false, message: 'Encrypted image storage is not configured (IMAGE_ENCRYPTION_KEY).' }, 503);
    }
    console.error('[OpthaEdge] Screening failed.', error instanceof Error ? error.message : error);
    return reply({ ok: false, message: 'Screening could not be completed. No result was stored.' }, 500);
  }
}
