import { MODEL_REGISTRY } from './modelRegistry.ts';
import type { BinaryResult, SeverityResult } from '@/types/prediction';

export class InvalidModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidModelOutputError';
  }
}

function validateLogits(values: readonly number[], expectedLength: number): void {
  if (values.length !== expectedLength) {
    throw new InvalidModelOutputError(
      `Expected ${expectedLength} output values, received ${values.length}.`,
    );
  }

  if (!values.every(Number.isFinite)) {
    throw new InvalidModelOutputError('Model output contains a non-finite value.');
  }
}

function softmax(logits: readonly number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((logit) => Math.exp(logit - maxLogit));
  const denominator = exps.reduce((sum, value) => sum + value, 0);

  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new InvalidModelOutputError('Model output could not be normalized.');
  }

  return exps.map((value) => value / denominator);
}

export function decodeBinaryOutput(rawOutput: ArrayLike<number>): BinaryResult {
  const logits = Array.from(rawOutput);
  validateLogits(logits, MODEL_REGISTRY.binary.output.dimensions[1]);
  const probabilities = softmax(logits);
  const drProbability = probabilities[1];
  const isDr = drProbability >= MODEL_REGISTRY.binary.decisionThreshold;

  return {
    prediction: isDr ? 'DR Detected' : 'No DR',
    probability: Math.round(drProbability * 10_000) / 10_000,
    confidence: Math.round((isDr ? drProbability : 1 - drProbability) * 10_000) / 100,
  };
}

export function decodeSeverityOutput(rawOutput: ArrayLike<number>): SeverityResult {
  const logits = Array.from(rawOutput);
  validateLogits(logits, MODEL_REGISTRY.severity.output.dimensions[1]);
  const probabilities = softmax(logits);
  const levelIndex = probabilities.indexOf(Math.max(...probabilities));
  const rawScore = probabilities.reduce((sum, probability, index) => sum + probability * index, 0);

  return {
    level: MODEL_REGISTRY.severity.output.labels[levelIndex],
    rawScore: Math.round(rawScore * 10_000) / 10_000,
    levelIndex,
    probabilities: probabilities.map((probability) => Math.round(probability * 10_000) / 10_000) as SeverityResult['probabilities'],
  };
}
