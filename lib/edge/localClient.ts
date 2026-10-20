import 'server-only';

import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { edgeHealthSchema, parseEdgeResult, type EdgeHealth, type EdgeResult } from './schema';

/**
 * Local inference fallback: runs the ONNX model directly on this machine
 * via edge/local_infer.py when the Raspberry Pi is not reachable.
 *
 * The same pipeline.py / pi_infer.py preprocessing is used, so grades are
 * identical regardless of whether the Pi or the laptop performed inference.
 */

const EDGE_DIR = join(process.cwd(), 'edge');
const LOCAL_SCRIPT = join(EDGE_DIR, 'local_infer.py');

/**
 * Python executable. Honours LOCAL_PYTHON_PATH for non-standard installs.
 * Falls back to 'python' on Windows, 'python3' elsewhere.
 */
function pythonBin(): string {
  return process.env.LOCAL_PYTHON_PATH?.trim() || (process.platform === 'win32' ? 'python' : 'python3');
}

function runLocal(args: string[], stdin?: Buffer): Promise<{ stdout: Buffer; code: number }> {
  return new Promise((resolve) => {
    const child = execFile(pythonBin(), [LOCAL_SCRIPT, ...args], {
      cwd: EDGE_DIR,
      maxBuffer: 30 * 1024 * 1024,
      timeout: 120_000,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      encoding: 'buffer',
    }, (error, stdout) => {
      let exitCode = 0;
      if (error) {
        exitCode = typeof error.code === 'number' ? error.code : 1;
      }
      resolve({
        stdout: Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout || ''),
        code: exitCode,
      });
    });
    if (stdin && child.stdin) {
      child.stdin.end(stdin);
    }
  });
}

export class LocalUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalUnavailableError';
  }
}

/** Check if the local ONNX model and Python dependencies are available. */
export async function getLocalHealth(): Promise<{ ok: true; health: EdgeHealth } | { ok: false; error: string }> {
  try {
    const { stdout, code } = await runLocal(['--health']);
    if (code !== 0) {
      const text = stdout.toString().trim();
      try {
        const parsed = JSON.parse(text) as { error?: string };
        return { ok: false, error: parsed.error ?? 'Local inference failed' };
      } catch {
        return { ok: false, error: text || 'Local inference failed' };
      }
    }
    const payload = JSON.parse(stdout.toString());
    const parsed = edgeHealthSchema.safeParse(payload);
    return parsed.success ? { ok: true, health: parsed.data } : { ok: false, error: 'Unexpected local health response' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Local inference unavailable' };
  }
}

/** Run local inference on a raw image buffer. */
export async function predictLocal(image: Buffer): Promise<EdgeResult> {
  const { stdout, code } = await runLocal([], image);
  const text = stdout.toString().trim();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new LocalUnavailableError('Local inference produced invalid output.');
  }
  if (code === 2) {
    // Image decode error
    const errorPayload = payload as { error?: string };
    throw new LocalUnavailableError(errorPayload?.error ?? 'Invalid image for local inference.');
  }
  if (code !== 0) {
    const errorPayload = payload as { error?: string };
    throw new LocalUnavailableError(errorPayload?.error ?? 'Local inference failed.');
  }
  return parseEdgeResult(payload);
}
