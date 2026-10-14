import 'server-only';

import { getBinarySession, getSeveritySession } from './modelLoader';
import { preprocessImage, preprocessImageInception } from './preprocessor';
import { decodeBinaryOutput, decodeSeverityOutput } from './outputDecoding';
import { getModelRunMetadata } from './modelRegistry';
import type { BinaryPrediction, SeverityPrediction } from '@/types/prediction';

export async function runBinaryInference(imageBuffer: Buffer): Promise<BinaryPrediction> {
  const startTime = performance.now();
  const session = await getBinarySession();
  const inputTensor = await preprocessImage(imageBuffer);
  const results = await session.run({ [session.inputNames[0]]: inputTensor });
  const outputTensor = results[session.outputNames[0]];

  if (!outputTensor || !(outputTensor.data instanceof Float32Array)) {
    throw new Error('Binary model returned a missing or non-float32 output tensor.');
  }

  return {
    mode: 'binary',
    binary: decodeBinaryOutput(outputTensor.data),
    inferenceTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    model: getModelRunMetadata('binary'),
  };
}

export async function runSeverityInference(imageBuffer: Buffer): Promise<SeverityPrediction> {
  const startTime = performance.now();
  const session = await getSeveritySession();
  const inputTensor = await preprocessImageInception(imageBuffer);
  const results = await session.run({ [session.inputNames[0]]: inputTensor });
  const outputTensor = results[session.outputNames[0]];

  if (!outputTensor || !(outputTensor.data instanceof Float32Array)) {
    throw new Error('Severity model returned a missing or non-float32 output tensor.');
  }

  return {
    mode: 'severity',
    severity: decodeSeverityOutput(outputTensor.data),
    inferenceTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    model: getModelRunMetadata('severity'),
  };
}
