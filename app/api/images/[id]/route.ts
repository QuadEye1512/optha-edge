import { readExaminationImage } from '@/data/examinations';
import { getCurrentActor } from '@/lib/auth/authorization';
import { AuthorizationError } from '@/lib/auth/policy';

export const runtime = 'nodejs';

/** Decrypts and serves a retinal image to an authorized user only. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const actor = await getCurrentActor();
  if (!actor) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  const variant = new URL(request.url).searchParams.get('variant') === 'model-input' ? 'model-input' : 'original';
  try {
    const image = await readExaminationImage(actor, id, variant);
    if (!image) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(image.data), {
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) return new Response('Forbidden', { status: 403 });
    console.error('[OpthaEdge] Image read failed.', error instanceof Error ? error.message : error);
    return new Response('Image unavailable', { status: 500 });
  }
}
