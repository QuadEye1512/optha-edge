/**
 * Model registry (UI Deployment Guide, section 5). The deployed model is the
 * distilled student (MobileNetV3-Large + LiteCBAM) running on the Raspberry Pi;
 * the platform never runs a model itself. Every stored prediction references
 * the artifact digest reported by the Pi, so each result is traceable.
 */
export const PREPROCESSING_VERSION = 'stage1-roi-224-v1';

export const STUDENT_MODEL = {
  id: 'opthaedge-dr-severity-student',
  task: '5-grade diabetic retinopathy severity',
  input: '1 × 3 × 224 × 224 RGB float32, range [0,1], ImageNet normalisation inside graph',
  output: '1 × 5 logits (argmax = DR grade 0–4)',
  labels: ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR'],
  preprocessing: 'stage1-roi-224-v1 (Gaussian-difference denoise, Otsu ROI crop, 384 then 224 resize)',
  training: 'Swin-B+CBAM teacher → MobileNetV3-L+LiteCBAM student (knowledge distillation), APTOS 2019, 80/20 stratified split',
  qualityGate: 'Laplacian-variance sharpness and mean-brightness thresholds on the Pi (starting values; calibrate on Pi-imager images)',
  validation: { n: 733, accuracy: 0.8145, qwk: 0.9033, macroF1: 0.6628, ocs: 0.795, macroAuc: 0.942 },
  binaryMode: 'No separate binary model: any-DR probability = 1 − P(No DR). Validation sensitivity 99.2%, specificity 94.7% at the argmax threshold.',
  limitations: [
    'No separate test set; metrics are from the validation split.',
    'Trained and validated on a single dataset (APTOS 2019).',
    'Weaker on severe and proliferative DR (macro-F1 0.66).',
    'Not yet tested on images from the 20D-lens prototype imager.',
    'Does not assess diabetic macular edema, glaucoma, cataract or other eye disease.',
    'Probabilities are not calibrated; confidence is not a clinical certainty.',
  ],
  status: 'research-only',
  variants: [
    {
      file: 'student_fp32.onnx',
      sha256: '3c5b87c8b37412fc332301401c32236291f00ec7b9f0a5e68480557b66b58947',
      sizeMb: 12.21,
      accuracy: 0.8145,
      qwk: 0.9033,
    },
    {
      file: 'student_int8.onnx',
      sha256: '5364e95159c903f2deb787434cd5ada7a25fd4614f53d060eadcb54cfa21d34c',
      sizeMb: 3.55,
      accuracy: 0.7844,
      qwk: 0.89,
    },
  ],
} as const;

export function findStudentVariant(sha256: string) {
  return STUDENT_MODEL.variants.find((variant) => variant.sha256 === sha256) ?? null;
}
