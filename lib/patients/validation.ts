import { z } from 'zod';

export const SEX_AT_BIRTH_OPTIONS = [
  'NOT_RECORDED',
  'FEMALE',
  'MALE',
  'INTERSEX',
  'UNKNOWN',
] as const;

export const DIABETES_TYPE_OPTIONS = ['TYPE_2', 'TYPE_1', 'GESTATIONAL', 'OTHER', 'UNKNOWN', 'NONE_REPORTED'] as const;
export const PREGNANCY_OPTIONS = ['NOT_RECORDED', 'NOT_PREGNANT', 'PREGNANT', 'NOT_APPLICABLE', 'UNKNOWN'] as const;
export const SMOKING_OPTIONS = ['NOT_RECORDED', 'NEVER', 'FORMER', 'CURRENT', 'UNKNOWN'] as const;
export const LATERALITY_OPTIONS = ['LEFT', 'RIGHT'] as const;

export const MEASUREMENT_OPTIONS = [
  { type: 'HBA1C', label: 'HbA1c', unit: '%', min: 3, max: 20 },
  { type: 'BLOOD_GLUCOSE', label: 'Blood glucose', unit: 'mg/dL', min: 20, max: 1000 },
  { type: 'SYSTOLIC_BLOOD_PRESSURE', label: 'Systolic BP', unit: 'mmHg', min: 50, max: 300 },
  { type: 'DIASTOLIC_BLOOD_PRESSURE', label: 'Diastolic BP', unit: 'mmHg', min: 30, max: 200 },
  { type: 'TOTAL_CHOLESTEROL', label: 'Total cholesterol', unit: 'mg/dL', min: 50, max: 600 },
  { type: 'LDL_CHOLESTEROL', label: 'LDL cholesterol', unit: 'mg/dL', min: 10, max: 500 },
  { type: 'HDL_CHOLESTEROL', label: 'HDL cholesterol', unit: 'mg/dL', min: 5, max: 200 },
  { type: 'TRIGLYCERIDES', label: 'Triglycerides', unit: 'mg/dL', min: 10, max: 3000 },
  { type: 'INTRAOCULAR_PRESSURE', label: 'Intraocular pressure', unit: 'mmHg', min: 1, max: 80 },
] as const;

export type MeasurementTypeOption = (typeof MEASUREMENT_OPTIONS)[number]['type'];

const optionalDate = z.string().trim().refine(
  (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
  'Enter a valid date.',
).refine(
  (value) => value === '' || !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
  'Enter a valid date.',
).refine(
  (value) => value === '' || new Date(`${value}T00:00:00.000Z`) <= new Date(),
  'The date cannot be in the future.',
);

const optionalText = (max: number) => z.string().trim().max(max);

export const patientCreateSchema = z.object({
  patientNumber: z.string()
    .trim()
    .toUpperCase()
    .min(3, 'Patient ID must contain at least 3 characters.')
    .max(32, 'Patient ID must contain at most 32 characters.')
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, 'Use only letters, numbers, and hyphens.'),
  givenName: z.string().trim().min(1, 'Given name is required.').max(100),
  familyName: z.string().trim().min(1, 'Family name is required.').max(100),
  preferredName: optionalText(100),
  preferredLanguage: optionalText(80),
  dateOfBirth: optionalDate,
  sexAtBirth: z.enum(SEX_AT_BIRTH_OPTIONS),
  phone: z.string().trim().max(20).refine((value) => value === '' || /^\+?[0-9 ()-]{6,20}$/.test(value), 'Enter a valid phone number.'),
  diabetesType: z.enum(DIABETES_TYPE_OPTIONS),
  diabetesDiagnosedAt: optionalDate,
  imageProcessingConsent: z.boolean(),
  dataRetentionConsent: z.boolean(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

export function patientInputFromFormData(formData: FormData): unknown {
  return {
    patientNumber: formData.get('patientNumber'),
    givenName: formData.get('givenName'),
    familyName: formData.get('familyName'),
    preferredName: formData.get('preferredName') ?? '',
    preferredLanguage: formData.get('preferredLanguage') ?? '',
    dateOfBirth: formData.get('dateOfBirth') ?? '',
    sexAtBirth: formData.get('sexAtBirth') ?? 'NOT_RECORDED',
    phone: formData.get('phone') ?? '',
    diabetesType: formData.get('diabetesType') ?? 'UNKNOWN',
    diabetesDiagnosedAt: formData.get('diabetesDiagnosedAt') ?? '',
    imageProcessingConsent: formData.get('imageProcessingConsent') === 'on',
    dataRetentionConsent: formData.get('dataRetentionConsent') === 'on',
  };
}

export const demographicsUpdateSchema = z.object({
  givenName: z.string().trim().min(1, 'Given name is required.').max(100),
  familyName: z.string().trim().min(1, 'Family name is required.').max(100),
  preferredName: optionalText(100),
  preferredLanguage: optionalText(80),
  dateOfBirth: optionalDate,
  sexAtBirth: z.enum(SEX_AT_BIRTH_OPTIONS),
  phone: z.string().trim().max(20).refine((value) => value === '' || /^\+?[0-9 ()-]{6,20}$/.test(value), 'Enter a valid phone number.'),
});

export const medicalHistorySchema = z.object({
  diabetesType: z.enum(DIABETES_TYPE_OPTIONS),
  diabetesDiagnosedAt: optionalDate,
  pregnancyStatus: z.enum(PREGNANCY_OPTIONS),
  smokingStatus: z.enum(SMOKING_OPTIONS),
  visualSymptoms: optionalText(500),
  notes: optionalText(2000),
});

export const measurementSchema = z.object({
  type: z.enum(MEASUREMENT_OPTIONS.map((option) => option.type) as [MeasurementTypeOption, ...MeasurementTypeOption[]]),
  value: z.coerce.number().finite(),
  observedAt: optionalDate.refine((value) => value !== '', 'Enter the date of the measurement.'),
  source: optionalText(120),
}).superRefine((input, context) => {
  const option = MEASUREMENT_OPTIONS.find((candidate) => candidate.type === input.type);
  if (option && (input.value < option.min || input.value > option.max)) {
    context.addIssue({ code: 'custom', path: ['value'], message: `Enter a value between ${option.min} and ${option.max} ${option.unit}.` });
  }
});

export const medicationSchema = z.object({
  name: z.string().trim().min(1, 'Medicine name is required.').max(160),
  instructions: optionalText(300),
  startedAt: optionalDate,
});

export const allergySchema = z.object({
  substance: z.string().trim().min(1, 'Substance is required.').max(160),
  reaction: optionalText(200),
  severity: z.enum(['', 'MILD', 'MODERATE', 'SEVERE']),
});

export const ocularHistorySchema = z.object({
  eye: z.enum(['', ...LATERALITY_OPTIONS]),
  condition: z.string().trim().min(1, 'Condition is required.').max(160),
  surgeryOrTreatment: optionalText(200),
  occurredAt: optionalDate,
  notes: optionalText(500),
});

export const noteSchema = z.object({
  note: z.string().trim().min(1, 'Write a note.').max(4000),
});

export function formToObject(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? '')]));
}
