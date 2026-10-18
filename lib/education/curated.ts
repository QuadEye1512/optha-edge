import { getDrGrade } from '../dr/grades.ts';
import type { EducationContent, EducationRequest } from './schema.ts';

/**
 * Curated, evidence-graded patient education used when the LLM is unavailable
 * (offline Pi, no API key) and as the safety baseline for generated content.
 * Sources: National Eye Institute (Diabetic Retinopathy, 2025), CDC (Vision Loss
 * and Diabetes, 2024), PREDIMED omega-3 / DR cohort (JAMA Ophthalmology 2016),
 * AREDS2 lutein/zeaxanthin data. Requires named clinician review before
 * production use.
 */
export const CURATED_GENERATOR = 'curated-v1';

const OVERVIEW_BASE =
  'Diabetic retinopathy is damage to the small blood vessels of the retina, the light-sensitive layer at the back of the eye. Over time, high blood sugar weakens these vessels so they can leak fluid or blood, or close off. The eye may then grow fragile new vessels that bleed easily.\n\nIt usually causes no pain and often no symptoms in the early stages, which is why regular eye checks are so important. Finding it early and keeping blood sugar, blood pressure and cholesterol under control greatly lowers the chance of vision loss.';

const STAGE_TEXT: Record<number, string> = {
  0: 'This screening did not find signs of diabetic retinopathy. That is good news, but diabetes can affect the eyes at any time, so yearly checks remain important.',
  1: 'This screening suggests the earliest stage (mild non-proliferative). Tiny bulges called microaneurysms may be present. Vision is usually normal at this stage and the changes can stabilise with good diabetes control.',
  2: 'This screening suggests moderate non-proliferative diabetic retinopathy. Some blood vessels are leaking or blocked. This stage should be seen by an eye specialist because the risk of progression is higher.',
  3: 'This screening suggests severe non-proliferative diabetic retinopathy. Many vessels are blocked and the retina may soon start growing abnormal new vessels. Please see an eye specialist urgently.',
  4: 'This screening suggests proliferative diabetic retinopathy, the advanced stage, where fragile new blood vessels grow and can bleed or cause retinal detachment. This can threaten sight and needs urgent treatment by an eye specialist. Diet and natural remedies cannot treat this stage.',
};

const MEDICAL_CARE: Record<number, EducationContent['medicalCare']> = {
  0: [{ title: 'Yearly diabetic eye examination', detail: 'A dilated eye exam or retinal photograph every year, or sooner if your doctor advises.' }],
  1: [
    { title: 'Closer monitoring', detail: 'Repeat retinal screening in 6–12 months to make sure the changes are not progressing.' },
    { title: 'Diabetes, blood pressure and cholesterol control', detail: 'The most effective treatment at this stage is good control of HbA1c, blood pressure and lipids with your doctor.' },
  ],
  2: [
    { title: 'Referral to an ophthalmologist', detail: 'A specialist examines the retina in detail, often with an OCT scan to check for swelling of the macula (diabetic macular edema).' },
    { title: 'Systemic control', detail: 'Tighter control of blood sugar, blood pressure and cholesterol slows progression.' },
  ],
  3: [
    { title: 'Urgent ophthalmology assessment', detail: 'The specialist may recommend laser treatment (pan-retinal photocoagulation) or injections to prevent progression.' },
    { title: 'OCT and macular assessment', detail: 'Checks for diabetic macular edema, which may need anti-VEGF injections.' },
  ],
  4: [
    { title: 'Urgent specialist treatment', detail: 'Common treatments are anti-VEGF injections into the eye and/or pan-retinal laser photocoagulation.' },
    { title: 'Vitrectomy when needed', detail: 'Surgery may be needed for bleeding inside the eye or retinal detachment.' },
  ],
};

const NATURAL_REMEDIES: EducationContent['naturalRemedies'] = [
  {
    name: 'Dark leafy greens (spinach, fenugreek leaves, amaranth, drumstick leaves)',
    howItMayHelp: 'Rich in lutein and zeaxanthin, antioxidants that concentrate in the retina, and low in sugar.',
    howToConsume: 'One to two cups cooked or raw every day, cooked with a little oil to improve absorption.',
    evidence: 'moderate',
    cautions: 'If you take warfarin, keep your intake of green leafy vegetables steady from week to week. People with kidney disease should ask about potassium.',
  },
  {
    name: 'Omega-3 rich foods (oily fish, flaxseed, walnuts, chia)',
    howItMayHelp: 'Regular dietary omega-3 intake has been linked with a lower risk of sight-threatening diabetic retinopathy.',
    howToConsume: 'Oily fish such as sardine, mackerel or salmon twice a week; vegetarians can use 1–2 tablespoons of ground flaxseed or a handful of walnuts daily.',
    evidence: 'moderate',
    cautions: 'High-dose fish-oil capsules can increase bleeding risk with blood thinners or aspirin; ask your doctor before taking supplements.',
  },
  {
    name: 'Fenugreek seeds (methi)',
    howItMayHelp: 'Soluble fibre that can modestly lower blood sugar after meals.',
    howToConsume: '1–2 teaspoons (5–10 g) of seeds soaked overnight in water, taken in the morning, or added to cooking.',
    evidence: 'limited',
    cautions: 'Can add to the effect of insulin or sulfonylurea tablets and cause low sugar; check your sugar more often when starting. Avoid medicinal amounts in pregnancy.',
  },
  {
    name: 'Amla (Indian gooseberry) and other vitamin C rich fruit',
    howItMayHelp: 'Antioxidants that support blood-vessel health; low-sugar fruit choice.',
    howToConsume: 'One fresh amla or a small serving of guava, orange or berries daily. Prefer whole fruit over juice.',
    evidence: 'limited',
    cautions: 'Avoid sweetened amla products (murabba, candy) which raise blood sugar.',
  },
  {
    name: 'Turmeric in food',
    howItMayHelp: 'Curcumin has anti-inflammatory effects in laboratory studies; human eye evidence is early.',
    howToConsume: 'Use 1/2–1 teaspoon in daily cooking with a pinch of black pepper; food amounts rather than capsules.',
    evidence: 'limited',
    cautions: 'High-dose curcumin supplements may increase bleeding with blood thinners and are not advised with gallstones. Food amounts are generally safe.',
  },
  {
    name: 'Green tea',
    howItMayHelp: 'Contains catechin antioxidants; a sugar-free drink that can replace sweet beverages.',
    howToConsume: '2–3 cups a day without sugar.',
    evidence: 'limited',
    cautions: 'Contains caffeine; limit if you have palpitations, poor sleep or are pregnant. Large amounts may reduce the effect of some heart medicines.',
  },
];

const WARNING_SIGNS = [
  'Sudden loss or blurring of vision in one or both eyes',
  'A sudden shower of new floaters, dark spots or "cobwebs"',
  'Flashes of light or a curtain-like shadow over part of your vision',
  'Severe eye pain, or a red eye with headache, nausea or vomiting',
  'Distorted or wavy central vision',
];

export function buildCuratedEducation(request: EducationRequest): EducationContent {
  const grade = getDrGrade(request.grade);
  const patient = request.patient;
  const personal: string[] = [STAGE_TEXT[grade.index]];
  if (patient.latestHbA1c) {
    personal.push(`Your most recent recorded HbA1c is ${patient.latestHbA1c}. Many adults with diabetes aim for below 7%, but your doctor will set the right target for you.`);
  }
  if (patient.latestBloodPressure) {
    personal.push(`Your most recent recorded blood pressure is ${patient.latestBloodPressure}. Keeping blood pressure in the range your doctor recommends protects the retina.`);
  }
  if (request.gradeSource === 'ai-preliminary') {
    personal.push('This is a preliminary, AI-assisted result. A clinician must review it before it is treated as final.');
  }

  const interactionWarnings: string[] = [];
  const meds = patient.medications.join(' ').toLowerCase();
  if (/warfarin|acenocoumarol|apixaban|rivaroxaban|dabigatran|clopidogrel|aspirin/.test(meds)) {
    interactionWarnings.push('You take a medicine that affects blood clotting: avoid high-dose fish oil, curcumin, ginkgo or garlic supplements unless your doctor approves them.');
  }
  if (/insulin|glimepiride|gliclazide|glibenclamide|glipizide|sulfonylurea/.test(meds)) {
    interactionWarnings.push('Your diabetes medicine can cause low blood sugar: fenugreek, bitter gourd (karela) and cinnamon may add to this effect, so check your sugar more often.');
  }
  if (patient.allergies.length) {
    interactionWarnings.push(`Check every food or herb against your recorded allergies (${patient.allergies.join(', ')}).`);
  }

  return {
    headline: `${grade.clinicalName}${request.gradeSource === 'ai-preliminary' ? ' (preliminary AI-assisted result)' : ''}`,
    conditionOverview: OVERVIEW_BASE,
    whatThisMeansForYou: personal.join('\n\n'),
    commonSymptoms: grade.index <= 1
      ? ['Usually no symptoms at this stage', 'Vision is typically normal']
      : ['Often no symptoms until the disease is advanced', 'Blurred or fluctuating vision', 'Floaters or dark spots', 'Difficulty seeing at night'],
    warningSigns: WARNING_SIGNS,
    medicalCare: MEDICAL_CARE[grade.index],
    naturalRemedies: NATURAL_REMEDIES,
    dietPlan: {
      include: [
        'Whole grains such as millets (ragi, jowar, bajra), brown rice and oats in controlled portions',
        'Pulses, lentils, chickpeas and sprouts for protein and fibre',
        'Half of each plate as non-starchy vegetables',
        'Low-sugar fruit such as guava, apple, berries and amla',
        'Nuts and seeds in small handfuls',
      ],
      limit: [
        'Sugar, sweets, sweetened drinks and fruit juices',
        'Refined flour (maida), white bread and large portions of white rice',
        'Fried snacks and foods high in saturated or trans fat',
        'Salt and salty pickles or papad (for blood pressure)',
        'Alcohol and all tobacco',
      ],
      sampleDay: [
        'Breakfast: vegetable oats upma or moong dal chilla with mint chutney; unsweetened tea',
        'Mid-morning: one guava or a handful of roasted chana',
        'Lunch: two multigrain rotis, dal, a large serving of leafy sabzi and salad',
        'Evening: green tea and a small handful of walnuts',
        'Dinner: millet khichdi with vegetables, or grilled fish with vegetables; buttermilk',
      ],
    },
    lifestyle: [
      'Take your diabetes and blood-pressure medicines exactly as prescribed',
      'Aim for at least 150 minutes of moderate activity a week, such as brisk walking (ask your eye doctor first if you have advanced retinopathy)',
      'Stop smoking and avoid second-hand smoke',
      'Sleep 7–8 hours and manage stress',
      'Keep a healthy weight',
    ],
    monitoring: [
      'HbA1c every 3–6 months (a common goal is below 7%, individualised by your doctor)',
      'Blood pressure at each visit (often below 130/80 mmHg)',
      'Cholesterol and kidney function at least yearly',
      'Home blood-sugar checks as advised',
    ],
    followUp: request.recommendedFollowUp,
    interactionWarnings,
    disclaimer:
      'This information supports, and does not replace, advice from your doctor or eye specialist. Natural remedies are complementary only: never stop or change prescribed medicine without your doctor. The screening result is AI-assisted research software and must be confirmed by a clinician.',
  };
}
