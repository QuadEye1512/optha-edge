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
    const response = await call('/health', { method: 'GET' }, 4000);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const parsed = edgeHealthSchema.safeParse(await response.json());
    return parsed.success ? { ok: true, health: parsed.data } : { ok: false, error: 'Unexpected health response' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unavailable' };
  }
}

export async function predictOnEdge(image: Buffer, fileName: string, mimeType: string): Promise<EdgeResult> {
  const body = new FormData();
  body.append('file', new Blob([new Uint8Array(image)], { type: mimeType }), fileName);
  body.append('include_preview', 'true');
  return readResult(await call('/predict', { method: 'POST', body }, 60_000));
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
