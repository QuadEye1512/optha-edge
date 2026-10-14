import type { DrSeverityLevel, ModelRunMetadata, PredictionMode } from '@/types/prediction';

export interface ModelRegistryEntry {
  id: string;
  artifactFile: string;
  artifactVersion: `sha256:${string}`;
  task: string;
  supportedConditions: readonly string[];
  input: {
    name: 'input';
    dimensions: readonly [1, 3, number, number];
    colorFormat: 'RGB';
    resizeMethod: 'cover';
    normalization: string;
  };
  output: {
    name: 'output';
    dimensions: readonly [1, number];
    labels: readonly string[];
    labelOrderVerified: false;
    transform: 'softmax-from-logits';
    transformVerifiedFromGraph: true;
  };
  decisionThreshold: number | null;
  thresholdVerified: false;
  preprocessingVersion: string;
  preprocessingVerifiedAgainstTraining: false;
  validationDataset: null;
  validationMetrics: null;
  intendedUse: string;
  knownLimitations: readonly string[];
  clinicalDeploymentStatus: 'blocked-pending-validation';
}

export const MODEL_REGISTRY = {
  binary: {
    id: 'opthaedge-dr-binary',
    artifactFile: 'retinal_binary_model.onnx',
    artifactVersion: 'sha256:dfc49e28bb3927ec47691320a12ae95d9af86b64bc16dd1240d56903d798f0d0',
    task: 'Binary diabetic-retinopathy screening',
    supportedConditions: ['Diabetic retinopathy'],
    input: {
      name: 'input',
      dimensions: [1, 3, 224, 224],
      colorFormat: 'RGB',
      resizeMethod: 'cover',
      normalization: 'Per-channel ImageNet mean [0.485, 0.456, 0.406] and standard deviation [0.229, 0.224, 0.225]',
    },
    output: {
      name: 'output',
      dimensions: [1, 2],
      labels: ['No DR', 'DR Detected'],
      labelOrderVerified: false,
      transform: 'softmax-from-logits',
      transformVerifiedFromGraph: true,
    },
    decisionThreshold: 0.5,
    thresholdVerified: false,
    preprocessingVersion: 'binary-imagenet-cover-224-v1',
    preprocessingVerifiedAgainstTraining: false,
    validationDataset: null,
    validationMetrics: null,
    intendedUse: 'Research-only binary screening support for color fundus photographs.',
    knownLimitations: [
      'Training configuration, class order, threshold selection, calibration, and external validation evidence were not supplied.',
      'No retinal-image quality model is available, so clinical gradability is not assessed.',
      'The model is not validated for lesion localization or diagnosis of other ocular conditions.',
    ],
    clinicalDeploymentStatus: 'blocked-pending-validation',
  },
  severity: {
    id: 'opthaedge-dr-severity-inceptionv3',
    artifactFile: 'inceptionv3.onnx',
    artifactVersion: 'sha256:a75ff338af12bb31b66e05403b4b8ab989ea7c2213aa42447642d6b348028836',
    task: 'Five-level diabetic-retinopathy severity grading',
    supportedConditions: ['Diabetic retinopathy'],
    input: {
      name: 'input',
      dimensions: [1, 3, 299, 299],
      colorFormat: 'RGB',
      resizeMethod: 'cover',
      normalization: 'Keras InceptionV3 scaling: pixel / 127.5 - 1.0',
    },
    output: {
      name: 'output',
      dimensions: [1, 5],
      labels: ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'] satisfies readonly DrSeverityLevel[],
      labelOrderVerified: false,
      transform: 'softmax-from-logits',
      transformVerifiedFromGraph: true,
    },
    decisionThreshold: null,
    thresholdVerified: false,
    preprocessingVersion: 'severity-inception-cover-299-v1',
    preprocessingVerifiedAgainstTraining: false,
    validationDataset: null,
    validationMetrics: null,
    intendedUse: 'Research-only five-level DR model-output review for color fundus photographs.',
    knownLimitations: [
      'Training configuration, class order, calibration, and external validation evidence were not supplied.',
      'No retinal-image quality model is available, so clinical gradability is not assessed.',
      'The model is not validated for lesion localization, macular edema confirmation, or referral urgency.',
    ],
    clinicalDeploymentStatus: 'blocked-pending-validation',
  },
} as const satisfies Record<PredictionMode, ModelRegistryEntry>;

export function getModelRunMetadata(mode: PredictionMode): ModelRunMetadata {
  const model = MODEL_REGISTRY[mode];
  return {
    modelId: model.id,
    artifactVersion: model.artifactVersion,
    preprocessingVersion: model.preprocessingVersion,
    clinicalDeploymentStatus: model.clinicalDeploymentStatus,
  };
}
