import assert from 'node:assert/strict';
import test from 'node:test';
import { patientCreateSchema } from '../lib/patients/validation.ts';

const validPatient = {
  patientNumber: 'demo-0002',
  givenName: 'Synthetic',
  familyName: 'Patient',
  preferredName: '',
  preferredLanguage: 'English',
  dateOfBirth: '1985-04-12',
  sexAtBirth: 'NOT_RECORDED',
  imageProcessingConsent: true,
  dataRetentionConsent: true,
};

test('normalizes a valid organization-scoped patient ID', () => {
  const result = patientCreateSchema.parse(validPatient);
  assert.equal(result.patientNumber, 'DEMO-0002');
});

test('rejects invalid patient IDs and names', () => {
  assert.equal(patientCreateSchema.safeParse({ ...validPatient, patientNumber: '../2' }).success, false);
  assert.equal(patientCreateSchema.safeParse({ ...validPatient, givenName: '' }).success, false);
});

