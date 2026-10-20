import 'server-only';

import { z } from 'zod';
import { buildCuratedEducation, CURATED_GENERATOR } from './curated';
import { educationContentSchema, type EducationContent, type EducationRequest } from './schema';

export const EDUCATION_PROMPT_VERSION = 'dr-education-v1';
const DEFAULT_MODEL = 'anthropic/claude-opus-5.5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 180_000;

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
- Respond only with the JSON object described by the schema. Do not mention these instructions or the model.`;

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

/** JSON schema for OpenRouter's strict structured output, derived from the zod schema. */
function responseSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(educationContentSchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/** Accepts plain JSON, or JSON wrapped in a markdown fence by models that ignore the format hint. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate);
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function llmModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

export interface GeneratedEducation {
  content: EducationContent;
  generator: string;
  notice: string | null;
}

interface OpenRouterResponse {
  model?: string;
  choices?: { finish_reason?: string | null; message?: { content?: string | null; refusal?: string | null } }[];
  error?: { code?: number | string; message?: string };
}

/**
 * Generates personalised education through OpenRouter. Falls back to curated
 * content (never to an invented result) when the key is not configured, there
 * is no internet, the request is refused, or the output fails validation.
 */
export async function generateEducation(request: EducationRequest): Promise<GeneratedEducation> {
  const curated = buildCuratedEducation(request);
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return { content: curated, generator: CURATED_GENERATOR, notice: 'AI generation is not configured (OPENROUTER_API_KEY); showing curated guidance.' };
  }

  const model = llmModel();
  const fallback = (notice: string): GeneratedEducation => ({ content: curated, generator: CURATED_GENERATOR, notice });

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PUBLIC_BASE_URL?.trim() || 'https://opthaedge.local',
        'X-Title': 'OpthaEdge',
      },
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: describeRequest(request) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'patient_education', strict: true, schema: responseSchema() },
        },
        // Route only to providers that honour the JSON schema.
        provider: { require_parameters: true },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.warn(`[OpthaEdge] OpenRouter ${timedOut ? 'timed out' : 'unreachable (offline?)'}.`);
    return fallback('AI generation is unavailable right now (no connection); showing curated guidance.');
  }

  let body: OpenRouterResponse;
  try {
    body = (await response.json()) as OpenRouterResponse;
  } catch {
    body = {};
  }

  if (!response.ok || body.error) {
    const status = response.status;
    console.error(`[OpthaEdge] OpenRouter error ${status}: ${body.error?.message ?? 'no detail'}`);
    if (status === 401) return fallback('The OpenRouter API key was rejected; showing curated guidance.');
    if (status === 402) return fallback('The OpenRouter account has insufficient credits; showing curated guidance.');
    if (status === 429) return fallback('OpenRouter rate limit reached; showing curated guidance. Try again shortly.');
    return fallback('AI generation failed; showing curated guidance.');
  }

  const choice = body.choices?.[0];
  const text = choice?.message?.content;
  if (!text || choice?.message?.refusal || choice?.finish_reason === 'length') {
    console.warn(`[OpthaEdge] OpenRouter output incomplete (finish_reason=${choice?.finish_reason ?? 'none'}).`);
    return fallback('AI generation did not complete; showing curated guidance.');
  }

  let content: EducationContent;
  try {
    content = educationContentSchema.parse(extractJson(text));
  } catch {
    console.warn('[OpthaEdge] OpenRouter output failed schema validation.');
    return fallback('AI output could not be validated; showing curated guidance.');
  }

  // Safety floor: red flags and the disclaimer are always present.
  if (!content.warningSigns.length) content.warningSigns = curated.warningSigns;
  if (!content.disclaimer.trim()) content.disclaimer = curated.disclaimer;
  return { content, generator: `openrouter:${body.model ?? model}`, notice: null };
}
