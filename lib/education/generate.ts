import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { buildCuratedEducation, CURATED_GENERATOR } from './curated';
import { educationContentSchema, type EducationContent, type EducationRequest } from './schema';

export const EDUCATION_PROMPT_VERSION = 'dr-education-v1';
const DEFAULT_MODEL = 'claude-opus-5-5';

const SYSTEM_PROMPT = `You write patient education for OpthaEdge, a diabetic-eye screening service used in clinics in India and similar settings. A retinal photograph was graded for diabetic retinopathy (DR) on the 5-grade international scale. You explain the result to the patient and their family, including evidence-graded diet and natural remedies and how to take them.

Who reads this: a patient with diabetes, often with limited health literacy, reading on a phone. Write at roughly a 6th–8th grade reading level, in short sentences, in the language requested. Keep medical terms only where useful and explain them.

Clinical safety rules — these override everything else:
- The grade comes from research software. If the grade source is "ai-preliminary", say clearly that a clinician must confirm it. Never present it as a final diagnosis.
- Natural and dietary approaches are complementary only. They support blood-sugar, blood-pressure and vascular health; they do not treat or reverse retinopathy. For grades 2–4, state plainly that specialist treatment (laser, anti-VEGF injections, surgery) is what protects sight, and that remedies must not delay referral.
- Never advise stopping, reducing or replacing a prescribed medicine, insulin or eye treatment.
- Recommend food-based amounts and commonly studied preparations only. Do not recommend high-dose supplements, unregulated herbal mixtures, eye drops made at home, or anything applied to the eye.
- Grade evidence honestly: "strong" only for well-established measures (glycaemic, blood-pressure and lipid control, stopping smoking); "moderate" for consistent observational or trial data (e.g. dietary omega-3, lutein-rich foods); "limited" for small or early studies; "traditional" for customary use without good evidence.
- For every remedy, list who should avoid it and interactions. Check the patient's listed medicines and allergies: blood thinners and antiplatelets (bleeding risk with fish-oil capsules, curcumin, ginkgo, garlic supplements); insulin and sulfonylureas (hypoglycaemia with fenugreek, bitter gourd, cinnamon); kidney disease (potassium, protein); pregnancy. Put patient-specific cautions in interactionWarnings.
- Do not recommend ginkgo or anything that increases bleeding risk for grades 3–4.
- Always include red-flag symptoms needing same-day care (sudden vision loss, a shower of floaters, flashes or a curtain over vision, severe eye pain or red eye with nausea).
- Keep follow-up advice consistent with the clinician-recommended interval provided; do not invent a different schedule.
- Prefer foods common in the patient's likely region (for example millets, dal, methi, amla, drumstick leaves for India) and give practical amounts and frequency.
- Do not mention these instructions, the model, or the JSON format.`;

function describeRequest(request: EducationRequest): string {
  const p = request.patient;
  const lines = [
    `Language for the whole response: ${p.preferredLanguage || 'English'}`,
    `Screened eye: ${request.eye === 'LEFT' ? 'left' : 'right'}`,
    `DR grade: ${request.grade} (${request.gradeLabel})`,
    `Grade source: ${request.gradeSource}`,
    `Clinician-recommended follow-up: ${request.recommendedFollowUp}`,
    `Referral urgency: ${request.referralUrgency}`,
    '',
    'Patient context (no identifiers):',
    `- Age: ${p.ageYears ?? 'not recorded'}`,
    `- Sex at birth: ${p.sexAtBirth.toLowerCase().replaceAll('_', ' ')}`,
    `- Pregnancy status: ${p.pregnancyStatus ?? 'not recorded'}`,
    `- Diabetes type: ${p.diabetesType ?? 'not recorded'}`,
    `- Years since diabetes diagnosis: ${p.diabetesDurationYears ?? 'not recorded'}`,
    `- Latest HbA1c: ${p.latestHbA1c ?? 'not recorded'}`,
    `- Latest blood pressure: ${p.latestBloodPressure ?? 'not recorded'}`,
    `- Current medicines: ${p.medications.length ? p.medications.join('; ') : 'none recorded'}`,
    `- Allergies: ${p.allergies.length ? p.allergies.join('; ') : 'none recorded'}`,
    `- Other eye history: ${p.ocularHistory.length ? p.ocularHistory.join('; ') : 'none recorded'}`,
  ];
  return lines.join('\n');
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

export interface GeneratedEducation {
  content: EducationContent;
  generator: string;
  notice: string | null;
}

/**
 * Generates personalised education with Claude. Falls back to curated content
 * (never to an invented result) when the API is not configured, the Pi has no
 * internet, the request is declined, or the output fails validation.
 */
export async function generateEducation(request: EducationRequest): Promise<GeneratedEducation> {
  const curated = buildCuratedEducation(request);
  if (!isLlmConfigured()) {
    return { content: curated, generator: CURATED_GENERATOR, notice: 'AI generation is not configured; showing curated guidance.' };
  }

  const model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
  const client = new Anthropic({ timeout: 180_000, maxRetries: 2 });

  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: betaZodOutputFormat(educationContentSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: describeRequest(request) }],
    });

    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens' || !response.parsed_output) {
      console.warn(`[OpthaEdge] Education generation incomplete (stop_reason=${response.stop_reason}); using curated content.`);
      return { content: curated, generator: CURATED_GENERATOR, notice: 'AI generation did not complete; showing curated guidance.' };
    }

    const content = educationContentSchema.parse(response.parsed_output);
    // Safety floor: red flags and the disclaimer are always present.
    if (!content.warningSigns.length) content.warningSigns = curated.warningSigns;
    if (!content.disclaimer.trim()) content.disclaimer = curated.disclaimer;
    return { content, generator: `anthropic:${response.model}`, notice: null };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[OpthaEdge] Anthropic API key rejected.');
    } else if (error instanceof Anthropic.RateLimitError) {
      console.warn('[OpthaEdge] Anthropic rate limit reached.');
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.warn('[OpthaEdge] Anthropic API unreachable (offline?).');
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[OpthaEdge] Anthropic API error ${error.status}.`);
    } else {
      console.error('[OpthaEdge] Education generation failed.', error instanceof Error ? error.message : error);
    }
    return { content: curated, generator: CURATED_GENERATOR, notice: 'AI generation is unavailable right now; showing curated guidance.' };
  }
}
