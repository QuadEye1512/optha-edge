/**
 * Five-grade DR scale used by the student model (International Clinical DR
 * scale, APTOS 2019 labels). Follow-up intervals and urgency are suggested
 * defaults the clinician confirms or changes; they are not automated decisions.
 */
export type DrGradeIndex = 0 | 1 | 2 | 3 | 4;

export interface DrGrade {
  index: DrGradeIndex;
  label: string;
  clinicalName: string;
  tone: 'emerald' | 'yellow' | 'orange' | 'red' | 'rose';
  summary: string;
  suggestedFollowUpDays: number;
  suggestedFollowUpText: string;
  suggestedUrgency: 'ROUTINE' | 'SOON' | 'URGENT';
  referable: boolean;
}

export const DR_GRADES: readonly DrGrade[] = [
  {
    index: 0,
    label: 'No DR',
    clinicalName: 'No apparent diabetic retinopathy',
    tone: 'emerald',
    summary: 'No signs of diabetic retinopathy were identified on this image.',
    suggestedFollowUpDays: 365,
    suggestedFollowUpText: 'Rescreen in 12 months',
    suggestedUrgency: 'ROUTINE',
    referable: false,
  },
  {
    index: 1,
    label: 'Mild',
    clinicalName: 'Mild non-proliferative diabetic retinopathy',
    tone: 'yellow',
    summary: 'Early changes (microaneurysms only) consistent with mild non-proliferative DR.',
    suggestedFollowUpDays: 180,
    suggestedFollowUpText: 'Rescreen in 6–12 months',
    suggestedUrgency: 'ROUTINE',
    referable: false,
  },
  {
    index: 2,
    label: 'Moderate',
    clinicalName: 'Moderate non-proliferative diabetic retinopathy',
    tone: 'orange',
    summary: 'Changes beyond microaneurysms consistent with moderate non-proliferative DR. Referable.',
    suggestedFollowUpDays: 90,
    suggestedFollowUpText: 'Refer to an ophthalmologist; review in 3–6 months',
    suggestedUrgency: 'SOON',
    referable: true,
  },
  {
    index: 3,
    label: 'Severe',
    clinicalName: 'Severe non-proliferative diabetic retinopathy',
    tone: 'red',
    summary: 'Extensive changes consistent with severe non-proliferative DR. High risk of progression.',
    suggestedFollowUpDays: 30,
    suggestedFollowUpText: 'Urgent ophthalmology referral (within weeks)',
    suggestedUrgency: 'URGENT',
    referable: true,
  },
  {
    index: 4,
    label: 'Proliferative DR',
    clinicalName: 'Proliferative diabetic retinopathy',
    tone: 'rose',
    summary: 'Findings consistent with proliferative DR (new vessel growth). Sight-threatening.',
    suggestedFollowUpDays: 14,
    suggestedFollowUpText: 'Urgent ophthalmology referral (as soon as possible)',
    suggestedUrgency: 'URGENT',
    referable: true,
  },
];

export const DR_LABELS = DR_GRADES.map((grade) => grade.label);

export function isDrGradeIndex(value: unknown): value is DrGradeIndex {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4;
}

export function getDrGrade(index: number): DrGrade {
  if (!isDrGradeIndex(index)) {
    throw new RangeError(`Unknown DR grade ${index}`);
  }
  return DR_GRADES[index];
}

export function suggestedFollowUpDate(index: number, from: Date): Date {
  const due = new Date(from);
  due.setUTCDate(due.getUTCDate() + getDrGrade(index).suggestedFollowUpDays);
  return due;
}

export const GRADE_TONE_CLASSES: Record<DrGrade['tone'], { text: string; bg: string; border: string; bar: string }> = {
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', bar: 'bg-emerald-400' },
  yellow: { text: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', bar: 'bg-yellow-400' },
  orange: { text: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/30', bar: 'bg-orange-400' },
  red: { text: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/30', bar: 'bg-red-500' },
  rose: { text: 'text-rose-200', bg: 'bg-rose-600/20', border: 'border-rose-500/40', bar: 'bg-rose-400' },
};
