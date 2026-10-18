import { getCurrentActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { EdgeUnavailableError, openEdgePreview } from '@/lib/edge/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Proxies the Pi camera's MJPEG stream so the phone never talks to the Pi directly. */
export async function GET(request: Request): Promise<Response> {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor, PERMISSIONS.EXAMINATION_CREATE)) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const upstream = await openEdgePreview(request.signal);
    if (!upstream.ok || !upstream.body) {
      return new Response('Camera preview unavailable', { status: upstream.status === 503 ? 503 : 502 });
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return new Response(error instanceof EdgeUnavailableError ? error.message : 'Preview unavailable', { status: 503 });
  }
}
