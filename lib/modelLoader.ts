import 'server-only';

import * as ort from 'onnxruntime-node';
import path from 'path';
import fs from 'fs';

// ── Binary model (DR / Non-DR) ──────────────────────────────────────────────
const BINARY_MODEL_PATH = path.join(process.cwd(), 'models', 'retinal_binary_model.onnx');

let binarySession: ort.InferenceSession | null = null;
let binarySessionPromise: Promise<ort.InferenceSession> | null = null;

export async function getBinarySession(): Promise<ort.InferenceSession> {
  if (binarySession) return binarySession;

  if (!binarySessionPromise) {
    binarySessionPromise = (async () => {
      // Load from Buffer to avoid onnxruntime searching for a .data sidecar file
      const modelBuffer = fs.readFileSync(BINARY_MODEL_PATH);
      const session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });
      binarySession = session;
      console.log('[OpthaEdgeDR] Binary model loaded');
      console.log('[OpthaEdgeDR] Binary inputs:', session.inputNames);
      console.log('[OpthaEdgeDR] Binary outputs:', session.outputNames);
      return session;
    })().catch((err) => {
      binarySessionPromise = null;
      throw err;
    });
  }

  return binarySessionPromise;
}

// ── Severity model (InceptionV3) ─────────────────────────────────────────────
const SEVERITY_MODEL_PATH = path.join(process.cwd(), 'models', 'inceptionv3.onnx');

let severitySession: ort.InferenceSession | null = null;
let severitySessionPromise: Promise<ort.InferenceSession> | null = null;

export async function getSeveritySession(): Promise<ort.InferenceSession> {
  if (severitySession) return severitySession;

  if (!severitySessionPromise) {
    severitySessionPromise = (async () => {
      const modelBuffer = fs.readFileSync(SEVERITY_MODEL_PATH);
      const session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });
      severitySession = session;
      console.log('[OpthaEdgeDR] Severity model loaded');
      console.log('[OpthaEdgeDR] Severity inputs:', session.inputNames);
      console.log('[OpthaEdgeDR] Severity outputs:', session.outputNames);
      return session;
    })().catch((err) => {
      severitySessionPromise = null;
      throw err;
    });
  }

  return severitySessionPromise;
}

// Legacy alias kept so any existing import of getSession still works
export const getSession = getBinarySession;
