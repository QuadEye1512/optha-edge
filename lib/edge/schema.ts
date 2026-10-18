import { z } from 'zod';

/** Labels in model output order, as declared by pi_infer.CLASS_NAMES. */
export const EDGE_LABELS = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR'] as const;

const probability = z.number().finite().min(0).max(1);

export const qualitySchema = z.object({
  gradable: z.boolean(),
  sharpness: z.number().finite(),
  brightness: z.number().finite(),
  reasons: z.array(z.string()).default([]),
});

const baseSchema = z.object({
  model_version: z.string().min(1),
  model_file: z.string().min(1),
  artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  preprocessing_version: z.string().min(1),
  image_width: z.number().int().positive(),
  image_height: z.number().int().positive(),
  research_only: z.literal(true),
  quality: qualitySchema,
  captured_jpeg: z.string().optional(),
});

const gradableSchema = baseSchema.extend({
  gradable: z.literal(true),
  grade: z.number().int().min(0).max(4),
  label: z.enum(EDGE_LABELS),
  confidence: probability,
  probability_vector: z.array(probability).length(5),
  any_dr_probability: probability,
  referable_probability: probability,
  latency_ms: z.number().finite().nonnegative(),
  preprocess_ms: z.number().finite().nonnegative().optional(),
  model_input_png: z.string().nullable().optional(),
});

const ungradableSchema = baseSchema.extend({
  gradable: z.literal(false),
  message: z.string(),
});

export const edgeResultSchema = z.discriminatedUnion('gradable', [gradableSchema, ungradableSchema]);

export type EdgeResult = z.infer<typeof edgeResultSchema>;
export type GradableEdgeResult = z.infer<typeof gradableSchema>;

export class InvalidEdgeResponseError extends Error {
  constructor(detail: string) {
    super(`The inference service returned an invalid response: ${detail}`);
    this.name = 'InvalidEdgeResponseError';
  }
}

/**
 * Validates the Pi response and cross-checks it, so a malformed or inconsistent
 * result is rejected instead of being shown or stored.
 */
export function parseEdgeResult(payload: unknown): EdgeResult {
  const parsed = edgeResultSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InvalidEdgeResponseError(parsed.error.issues.map((issue) => issue.path.join('.') || issue.message).join(', '));
  }
  const result = parsed.data;
  if (result.gradable) {
    const probs = result.probability_vector;
    const sum = probs.reduce((total, value) => total + value, 0);
    if (Math.abs(sum - 1) > 1e-3) {
      throw new InvalidEdgeResponseError('probabilities do not sum to 1');
    }
    const argmax = probs.indexOf(Math.max(...probs));
    if (argmax !== result.grade || EDGE_LABELS[result.grade] !== result.label) {
      throw new InvalidEdgeResponseError('grade does not match probabilities');
    }
  }
  return result;
}

export const edgeHealthSchema = z.object({
  status: z.literal('ok'),
  model: z.string(),
  model_file: z.string(),
  artifact_sha256: z.string(),
  preprocessing: z.string(),
  labels: z.array(z.string()),
  threads: z.number(),
  camera: z.object({ available: z.boolean(), detail: z.string().nullable(), flip: z.string().optional() }),
  auth_required: z.boolean(),
});

export type EdgeHealth = z.infer<typeof edgeHealthSchema>;
