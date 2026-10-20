import assert from 'node:assert/strict';
import test from 'node:test';
import { InvalidEdgeResponseError, parseEdgeResult } from '../lib/edge/schema.ts';

const base = {
  model_version: 'student-mnv3-litecbam-student_int8.onnx',
  model_file: 'student_int8.onnx',
  artifact_sha256: '5364e95159c903f2deb787434cd5ada7a25fd4614f53d060eadcb54cfa21d34c',
  preprocessing_version: 'stage1-roi-224-v1',
  image_width: 1024,
  image_height: 768,
  research_only: true,
  quality: { gradable: true, sharpness: 120.5, brightness: 90.1, reasons: [] },
};

const gradable = {
  ...base,
  gradable: true,
  grade: 2,
  label: 'Moderate',
  confidence: 0.6,
  probability_vector: [0.05, 0.15, 0.6, 0.15, 0.05],
  any_dr_probability: 0.95,
  referable_probability: 0.8,
  latency_ms: 42.1,
  model_input_png: null,
};

test('accepts a consistent gradable Pi response', () => {
  const result = parseEdgeResult(gradable);
  assert.equal(result.gradable, true);
  if (result.gradable) assert.equal(result.label, 'Moderate');
});

test('accepts an ungradable response without a grade', () => {
  const result = parseEdgeResult({
    ...base,
    gradable: false,
    quality: { ...base.quality, gradable: false, reasons: ['BLURRY'] },
    message: 'Image quality too low, please recapture.',
  });
  assert.equal(result.gradable, false);
});

test('rejects a grade that does not match the probabilities', () => {
  assert.throws(() => parseEdgeResult({ ...gradable, grade: 0, label: 'No DR' }), InvalidEdgeResponseError);
});

test('rejects probabilities that do not sum to one', () => {
  assert.throws(() => parseEdgeResult({ ...gradable, probability_vector: [0.1, 0.1, 0.6, 0.1, 0.5] }), InvalidEdgeResponseError);
});

test('rejects wrong vector length, bad digest and missing research flag', () => {
  assert.throws(() => parseEdgeResult({ ...gradable, probability_vector: [0.4, 0.6] }), InvalidEdgeResponseError);
  assert.throws(() => parseEdgeResult({ ...gradable, artifact_sha256: 'abc' }), InvalidEdgeResponseError);
  assert.throws(() => parseEdgeResult({ ...gradable, research_only: false }), InvalidEdgeResponseError);
});
