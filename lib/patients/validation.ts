import { z } from 'zod';

export const SEX_AT_BIRTH_OPTIONS = [
  'NOT_RECORDED',
  'FEMALE',
  'MALE',
  'INTERSEX',
  'UNKNOWN',
] as const;

const optionalDate = z.string().trim().refine(
  (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
  'Enter a valid date.',
).refine(
  (value) => value === '' || !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
  'Enter a valid date.',
);

export const patientCreateSchema = z.object({
  patientNumber: z.string()
    .trim()
    .toUpperCase()
    .min(3, 'Patient ID must contain at least 3 characters.')
    .max(32, 'Patient ID must contain at most 32 characters.')
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, 'Use only letters, numbers, and hyphens.'),
  givenName: z.string().trim().min(1, 'Given name is required.').max(100),
  familyName: z.string().trim().min(1, 'Family name is required.').max(100),
  preferredName: z.string().trim().max(100),
  preferredLanguage: z.string().trim().max(80),
  dateOfBirth: optionalDate,
  sexAtBirth: z.enum(SEX_AT_BIRTH_OPTIONS),
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
    imageProcessingConsent: formData.get('imageProcessingConsent') === 'on',
    dataRetentionConsent: formData.get('dataRetentionConsent') === 'on',
  };
}

