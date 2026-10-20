import assert from 'node:assert/strict';
import test from 'node:test';
import { DR_GRADES, getDrGrade, suggestedFollowUpDate } from '../lib/dr/grades.ts';
import { buildCuratedEducation } from '../lib/education/curated.ts';
import { educationContentSchema, type EducationRequest } from '../lib/education/schema.ts';

const request: EducationRequest = {
  grade: 3,
  gradeLabel: 'Severe non-proliferative diabetic retinopathy',
  gradeSource: 'ai-preliminary',
  eye: 'RIGHT',
  recommendedFollowUp: 'Urgent ophthalmology referral (within weeks)',
  referralUrgency: 'URGENT',
  patient: {
    ageYears: 52,
    sexAtBirth: 'FEMALE',
    preferredLanguage: 'English',
    diabetesType: 'TYPE_2',
    diabetesDurationYears: 9,
    latestHbA1c: '8.4%',
    latestBloodPressure: '142/88 mmHg',
    medications: ['Warfarin 5 mg', 'Glimepiride 2 mg'],
    allergies: ['Peanuts'],
    ocularHistory: [],
    pregnancyStatus: null,
  },
};

test('grade scale matches the model output order', () => {
  assert.deepEqual(DR_GRADES.map((grade) => grade.label), ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR']);
  assert.deepEqual(DR_GRADES.map((grade) => grade.referable), [false, false, true, true, true]);
  assert.throws(() => getDrGrade(5), RangeError);
});

test('more severe grades get earlier follow-up', () => {
  const days = DR_GRADES.map((grade) => grade.suggestedFollowUpDays);
  assert.deepEqual([...days].sort((a, b) => b - a), days);
  const due = suggestedFollowUpDate(4, new Date('2026-01-01T00:00:00Z'));
  assert.equal(due.toISOString().slice(0, 10), '2026-01-15');
});

test('curated education is schema-valid and flags medicine interactions', () => {
  const content = buildCuratedEducation(request);
  assert.equal(educationContentSchema.safeParse(content).success, true);
  assert.ok(content.warningSigns.length >= 3);
  assert.ok(content.interactionWarnings.some((warning) => /blood clotting/.test(warning)));
  assert.ok(content.interactionWarnings.some((warning) => /low blood sugar/.test(warning)));
  assert.ok(content.interactionWarnings.some((warning) => /Peanuts/.test(warning)));
  assert.match(content.headline, /preliminary/);
  assert.match(content.disclaimer, /never stop/i);
});

test('curated education without risky medicines has no interaction warnings', () => {
  const content = buildCuratedEducation({ ...request, grade: 0, gradeSource: 'clinician-confirmed', patient: { ...request.patient, medications: ['Metformin'], allergies: [] } });
  assert.deepEqual(content.interactionWarnings, []);
  assert.doesNotMatch(content.headline, /preliminary/);
});
