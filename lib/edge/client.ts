import 'server-only';

import { edgeHealthSchema, parseEdgeResult, type EdgeHealth, type EdgeResult } from './schema';

export class EdgeUnavailableError extends Error {
  constructor(message: string, readonly status = 503) {
    super(message);
    this.name = 'EdgeUnavailableError';
  }
}

function baseUrl(): string {
  return (process.env.INFERENCE_URL?.trim() || 'http://127.0.0.1:8001').replace(/\/+$/, '');
}

function headers(): HeadersInit {
  const key = process.env.INFERENCE_API_KEY?.trim();
  return key ? { 'X-Inference-Key': key } : {};
}

async function call(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: { ...headers(), ...init.headers },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timed out' : 'is not reachable';
    throw new EdgeUnavailableError(`The Raspberry Pi inference service ${reason}.`);
  }
}

async function readResult(response: Response): Promise<EdgeResult> {
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { detail?: unknown };
      detail = typeof body.detail === 'string' ? body.detail : '';
    } catch {
      // Non-JSON error body.
    }
    if (response.status === 400 || response.status === 413) {
      throw new EdgeUnavailableError(detail || 'The image was rejected by the inference service.', response.status);
    }
    throw new EdgeUnavailableError(detail || `The inference service failed (HTTP ${response.status}).`);
  }
  return parseEdgeResult(await response.json());
}

export async function getEdgeHealth(): Promise<{ ok: true; health: EdgeHealth } | { ok: false; error: string }> {
  try {
    const response = await call('/health', { method: 'GET' }, 3000);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const parsed = edgeHealthSchema.safeParse(await response.json());
    return parsed.success ? { ok: true, health: parsed.data } : { ok: false, error: 'Unexpected health response' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unavailable' };
  }
}

export { getLocalHealth, predictLocal, LocalUnavailableError } from './localClient';
import { getLocalHealth, predictLocal } from './localClient';

export type InferenceBackend = 'edge' | 'local' | 'none';

export type InferenceHealth =
  | { ok: true; backend: 'edge'; health: EdgeHealth; source: string; camera: boolean }
  | { ok: true; backend: 'local'; health: EdgeHealth; source: string; camera: boolean; piError: string }
  | { ok: false; backend: 'none'; error: string; camera: false };

/**
 * Checks the Raspberry Pi first. If connected and healthy, returns 'edge'.
 * If the Pi is unreachable, falls back to local processing on the laptop CPU/GPU.
 */
export async function getInferenceHealth(): Promise<InferenceHealth> {
  const edge = await getEdgeHealth();
  if (edge.ok) {
    return {
      ok: true,
      backend: 'edge',
      health: edge.health,
      source: 'Raspberry Pi (Edge device)',
      camera: edge.health.camera.available,
    };
  }

  const local = await getLocalHealth();
  if (local.ok) {
    return {
      ok: true,
      backend: 'local',
      health: local.health,
      source: 'Laptop processing unit',
      camera: false,
      piError: edge.error,
    };
  }

  return {
    ok: false,
    backend: 'none',
    error: `Raspberry Pi unreachable (${edge.error}) and local inference unavailable (${local.error}).`,
    camera: false,
  };
}

export async function predictOnEdge(image: Buffer, fileName: string, mimeType: string): Promise<EdgeResult> {
  const body = new FormData();
  body.append('file', new Blob([new Uint8Array(image)], { type: mimeType }), fileName);
  body.append('include_preview', 'true');
  return readResult(await call('/predict', { method: 'POST', body }, 60_000));
}

/**
 * Predicts on the edge device if available. If edge is disconnected or fails,
 * automatically routes to local inference on the laptop.
 */
export async function predictAdaptive(
  image: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ result: EdgeResult; backend: 'edge' | 'local' }> {
  const edge = await getEdgeHealth();
  if (edge.ok) {
    try {
      const result = await predictOnEdge(image, fileName, mimeType);
      return { result, backend: 'edge' };
    } catch (error) {
      console.warn('[OpthaEdge] Edge device predict failed, automatically falling back to laptop inference:', error);
      const result = await predictLocal(image);
      return { result, backend: 'local' };
    }
  }

  const result = await predictLocal(image);
  return { result, backend: 'local' };
}

export async function captureOnEdge(): Promise<EdgeResult> {
  const body = new FormData();
  body.append('include_preview', 'true');
  return readResult(await call('/capture', { method: 'POST', body }, 60_000));
}

/** Live alignment stream from the Pi camera; the caller proxies the body. */
export async function openEdgePreview(signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(`${baseUrl()}/preview.mjpg`, { headers: headers(), cache: 'no-store', signal });
  } catch {
    throw new EdgeUnavailableError('The Raspberry Pi camera preview is not reachable.');
  }
}

