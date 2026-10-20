export const PERMISSIONS = {
  PATIENT_READ: 'patient.read',
  PATIENT_CREATE: 'patient.create',
  PATIENT_UPDATE: 'patient.update',
  EXAMINATION_READ: 'examination.read',
  EXAMINATION_CREATE: 'examination.create',
  PREDICTION_RUN: 'prediction.run',
  REVIEW_SIGN: 'review.sign',
  FOLLOWUP_MANAGE: 'followup.manage',
  EDUCATION_GENERATE: 'education.generate',
  REPORT_SHARE: 'report.share',
  ADMINISTRATION_MANAGE: 'administration.manage',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly PermissionCode[] = Object.values(PERMISSIONS);

/** Role templates seeded into the database. Permissions are always read from the database at runtime. */
export const ROLE_TEMPLATES = [
  {
    code: 'administrator',
    name: 'Administrator',
    description: 'Manages users, devices and every clinical workflow.',
    permissions: ALL_PERMISSIONS,
  },
  {
    code: 'clinician-reviewer',
    name: 'Clinician',
    description: 'Screens patients, signs AI-assisted reviews, plans follow-up and shares reports.',
    permissions: ALL_PERMISSIONS.filter((code) => code !== PERMISSIONS.ADMINISTRATION_MANAGE),
  },
  {
    code: 'screening-technician',
    name: 'Screening Technician',
    description: 'Registers patients and captures retinal images; cannot sign reviews.',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.PATIENT_CREATE,
      PERMISSIONS.PATIENT_UPDATE,
      PERMISSIONS.EXAMINATION_READ,
      PERMISSIONS.EXAMINATION_CREATE,
      PERMISSIONS.PREDICTION_RUN,
      PERMISSIONS.FOLLOWUP_MANAGE,
    ],
  },
] as const satisfies readonly {
  code: string;
  name: string;
  description: string;
  permissions: readonly PermissionCode[];
}[];
