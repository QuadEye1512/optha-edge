import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeBinaryOutput,
  decodeSeverityOutput,
  InvalidModelOutputError,
} from '../lib/outputDecoding.ts';

test('decodes exactly two binary logits with softmax', () => {
  const result = decodeBinaryOutput([0, 1]);
  assert.equal(result.prediction, 'DR Detected');
  assert.equal(result.probability, 0.7311);
  assert.equal(result.confidence, 73.11);
});

test('rejects an unexpected binary output shape', () => {
  assert.throws(() => decodeBinaryOutput([0.9]), InvalidModelOutputError);
  assert.throws(() => decodeBinaryOutput([0.1, 0.2, 0.7]), InvalidModelOutputError);
});

test('decodes exactly five severity logits in registry order', () => {
  const result = decodeSeverityOutput([0, 0, 3, 0, 0]);
  assert.equal(result.level, 'Moderate');
  assert.equal(result.levelIndex, 2);
  assert.equal(result.probabilities.length, 5);
});

test('rejects non-finite and incorrectly shaped severity output', () => {
  assert.throws(() => decodeSeverityOutput([0, 0, Number.NaN, 0, 0]), InvalidModelOutputError);
  assert.throws(() => decodeSeverityOutput([0, 0, 0, 0]), InvalidModelOutputError);
});
