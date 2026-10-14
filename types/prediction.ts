export type PredictionMode = 'binary' | 'severity';

export interface ModelRunMetadata {
  modelId: string;
  artifactVersion: `sha256:${string}`;
  preprocessingVersion: string;
  clinicalDeploymentStatus: 'blocked-pending-validation';
}

export interface BinaryResult {
  prediction: 'DR Detected' | 'No DR';
  probability: number;
  confidence: number;
}

export type DrSeverityLevel =
  | 'No DR'
  | 'Mild'
  | 'Moderate'
  | 'Severe'
  | 'Proliferative';

export interface SeverityResult {
  level: DrSeverityLevel;
  rawScore: number;
  levelIndex: number;
  probabilities: [number, number, number, number, number];
}

interface PredictionBase {
  inferenceTimeMs: number;
  model: ModelRunMetadata;
}

export interface BinaryPrediction extends PredictionBase {
  mode: 'binary';
  binary: BinaryResult;
}

export interface SeverityPrediction extends PredictionBase {
  mode: 'severity';
  severity: SeverityResult;
}

export type PredictionResult = BinaryPrediction | SeverityPrediction;

export type PredictionErrorCode =
  | 'INVALID_FORM_DATA'
  | 'MISSING_IMAGE'
  | 'INVALID_MODE'
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_IMAGE_CONTENT'
  | 'MIME_CONTENT_MISMATCH'
  | 'CORRUPT_IMAGE'
  | 'IMAGE_DIMENSIONS_TOO_LARGE'
  | 'MODEL_OUTPUT_INVALID'
  | 'INFERENCE_FAILED';

export type ApiResponse =
  | {
      success: true;
      result: PredictionResult;
    }
  | {
      success: false;
      error: {
        code: PredictionErrorCode;
        message: string;
      };
    };
