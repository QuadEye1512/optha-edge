'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  amendReview,
  createShareLink,
  generateEducationForExamination,
  revokeShareLinks,
  signReview,
} from '@/data/examinations';
import { ReferralUrgency, ReviewDecision } from '@/generated/prisma/client';
import { getCurrentActor } from '@/lib/auth/authorization';
import { errorState, failure, success, validationFailure, type FormState } from '@/lib/formState';

const SESSION_EXPIRED = 'Your session is missing or no longer active. Sign in again.';

const reviewSchema = z.object({
  decision: z.enum(ReviewDecision),
  confirmedGrade: z.string().regex(/^[0-4]?$/),
  assessment: z.string().trim().min(3, 'Write a short clinical assessment.').max(4000),
  referralUrgency: z.enum(ReferralUrgency),
  referralReason: z.string().trim().max(500),
  referralDestination: z.string().trim().max(200),
  repeatImagingReason: z.string().trim().max(500),
  followUpDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Choose a valid follow-up date.'),
});

export async function signReviewAction(examinationId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  const parsed = reviewSchema.safeParse(Object.fromEntries(
    ['decision', 'confirmedGrade', 'assessment', 'referralUrgency', 'referralReason', 'referralDestination', 'repeatImagingReason', 'followUpDate']
      .map((key) => [key, String(formData.get(key) ?? '')]),
  ));
  if (!parsed.success) return validationFailure(parsed.error);
  if (formData.get('attest') !== 'on') return failure('Confirm that you reviewed the original image before signing.');
  try {
    await signReview(actor, examinationId, {
      ...parsed.data,
      confirmedGrade: parsed.data.confirmedGrade === '' ? null : Number(parsed.data.confirmedGrade),
    });
  } catch (error) {
    return errorState(error, 'The review could not be signed.');
  }
  revalidatePath(`/examinations/${examinationId}`);
  revalidatePath('/review-queue');
  return success('Review signed and locked.');
}

export async function amendReviewAction(examinationId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  const reason = String(formData.get('reason') ?? '').trim();
  const amendment = String(formData.get('amendment') ?? '').trim();
  if (reason.length < 3 || amendment.length < 3) return failure('Give a reason and the amendment text.');
  try {
    await amendReview(actor, examinationId, reason.slice(0, 500), amendment.slice(0, 4000));
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/examinations/${examinationId}`);
  return success('Amendment added to the signed review.');
}

export async function generateEducationAction(examinationId: string, _state: FormState): Promise<FormState> {
  void _state;
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  try {
    const { notice } = await generateEducationForExamination(actor, examinationId);
    revalidatePath(`/examinations/${examinationId}`);
    return notice ? { ...success(notice), ok: true } : success('Patient education generated.');
  } catch (error) {
    return errorState(error, 'Patient education could not be generated.');
  }
}

export interface ShareState extends FormState {
  url?: string;
  expiresAt?: string;
}

export async function createShareLinkAction(examinationId: string, _state: ShareState): Promise<ShareState> {
  void _state;
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  try {
    const { token, expiresAt } = await createShareLink(actor, examinationId);
    // Absolute when PUBLIC_BASE_URL is set; otherwise the browser prefixes its own origin.
    const base = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ?? '';
    revalidatePath(`/examinations/${examinationId}`);
    return { ...success('Share link created. It expires in 14 days.'), url: `${base}/share/${token}`, expiresAt };
  } catch (error) {
    return errorState(error, 'The share link could not be created.');
  }
}

export async function revokeShareLinksAction(examinationId: string): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) return;
  await revokeShareLinks(actor, examinationId);
  revalidatePath(`/examinations/${examinationId}`);
}
