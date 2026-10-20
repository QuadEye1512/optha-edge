import { getCurrentActor } from '@/lib/auth/authorization';
import { getEdgeHealth, getInferenceHealth } from '@/lib/edge/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface DeviceStatusResponse {
  ok: boolean;
  backend: 'edge' | 'local' | 'none';
  edgeOnline: boolean;
  localOnline: boolean;
  camera: boolean;
  model: string | null;
  source: string;
  detail?: string | null;
}

export async function GET(): Promise<Response> {
  const actor = await getCurrentActor();
  if (!actor) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [inference, edge] = await Promise.all([
    getInferenceHealth(),
    getEdgeHealth(),
  ]);

  if (inference.ok) {
    const payload: DeviceStatusResponse = {
      ok: true,
      backend: inference.backend,
      edgeOnline: edge.ok,
      localOnline: true,
      camera: inference.camera,
      model: inference.health.model_file,
      source: inference.source,
      detail: inference.backend === 'edge'
        ? inference.health.camera.detail
        : 'Raspberry Pi is not connected. Screening is running via laptop processing unit.',
    };
    return Response.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  }

  const payload: DeviceStatusResponse = {
    ok: false,
    backend: 'none',
    edgeOnline: false,
    localOnline: false,
    camera: false,
    model: null,
    source: 'None',
    detail: inference.error,
  };
  return Response.json(payload, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
