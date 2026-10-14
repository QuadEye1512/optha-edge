export const PERMISSIONS = {
  PATIENT_READ: 'patient.read',
  PATIENT_CREATE: 'patient.create',
  PATIENT_UPDATE: 'patient.update',
  EXAMINATION_READ: 'examination.read',
  EXAMINATION_CREATE: 'examination.create',
  PREDICTION_RUN: 'prediction.run',
  ADMINISTRATION_MANAGE: 'administration.manage',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
