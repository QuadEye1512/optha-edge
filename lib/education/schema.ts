import { z } from 'zod';

export const EVIDENCE_LEVELS = ['strong', 'moderate', 'limited', 'traditional'] as const;

export const educationContentSchema = z.object({
  headline: z.string().describe('One short sentence naming the condition and stage in plain language.'),
  conditionOverview: z.string().describe('What diabetic retinopathy is and what this stage means, 2-4 short paragraphs separated by blank lines.'),
  whatThisMeansForYou: z.string().describe('Personalised explanation using the patient context provided (age, diabetes duration, HbA1c, blood pressure).'),
  commonSymptoms: z.array(z.string()).describe('Symptoms people at this stage may or may not notice.'),
  warningSigns: z.array(z.string()).describe('Red-flag symptoms that need same-day eye care.'),
  medicalCare: z.array(z.object({
    title: z.string(),
    detail: z.string(),
  })).describe('Standard medical care an eye doctor may discuss at this stage.'),
  naturalRemedies: z.array(z.object({
    name: z.string().describe('Food, herb or natural approach.'),
    howItMayHelp: z.string(),
    howToConsume: z.string().describe('Practical food-based amount, preparation and frequency.'),
    evidence: z.enum(EVIDENCE_LEVELS),
    cautions: z.string().describe('Interactions, who should avoid it, and side effects. Mention the patient\'s listed medicines when relevant.'),
  })).describe('Supportive natural and dietary approaches. Complementary only; never a replacement for treatment.'),
  dietPlan: z.object({
    include: z.array(z.string()),
    limit: z.array(z.string()),
    sampleDay: z.array(z.string()).describe('A simple sample day of meals suited to the patient\'s region and language.'),
  }),
  lifestyle: z.array(z.string()),
  monitoring: z.array(z.string()).describe('What to track (HbA1c, blood pressure, lipids, kidney function) and typical targets to discuss with the doctor.'),
  followUp: z.string().describe('When to have the next eye examination, consistent with the clinician-recommended interval given.'),
  interactionWarnings: z.array(z.string()).describe('Specific cautions about remedies in combination with the listed medicines or allergies. Empty if none apply.'),
  disclaimer: z.string(),
});

export type EducationContent = z.infer<typeof educationContentSchema>;

export interface EducationPatientContext {
  ageYears: number | null;
  sexAtBirth: string;
  preferredLanguage: string;
  diabetesType: string | null;
  diabetesDurationYears: number | null;
  latestHbA1c: string | null;
  latestBloodPressure: string | null;
  medications: string[];
  allergies: string[];
  ocularHistory: string[];
  pregnancyStatus: string | null;
}

export interface EducationRequest {
  grade: number;
  gradeLabel: string;
  gradeSource: 'clinician-confirmed' | 'ai-preliminary';
  eye: 'LEFT' | 'RIGHT';
  recommendedFollowUp: string;
  referralUrgency: string;
  patient: EducationPatientContext;
}
