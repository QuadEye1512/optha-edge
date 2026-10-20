import { Badge, Card, Notice, Page, PageHeader } from '@/components/ui';
import { DR_GRADES, GRADE_TONE_CLASSES } from '@/lib/dr/grades';

const RELATED = [
  {
    name: 'Diabetic macular edema (DME)',
    relation: 'Can occur at any DR stage',
    detected: false,
    text: 'Fluid leaks into the macula, the centre of the retina used for reading and faces, causing blurred central vision. Needs OCT or a specialist exam to confirm; treated with anti-VEGF injections, steroids or laser.',
  },
  {
    name: 'Cataract',
    relation: 'More common and earlier in diabetes',
    detected: false,
    text: 'Clouding of the lens causing glare and blurred vision. It is a lens condition, not a retinal one, so a fundus photo cannot diagnose it; dense cataract can make retinal images ungradable.',
  },
  {
    name: 'Open-angle glaucoma',
    relation: 'Risk roughly doubled with diabetes',
    detected: false,
    text: 'Gradual optic-nerve damage, often with raised eye pressure and no early symptoms. Needs pressure measurement, optic-disc assessment and visual-field testing.',
  },
  {
    name: 'Neovascular glaucoma',
    relation: 'Complication of advanced DR',
    detected: false,
    text: 'Abnormal vessels grow on the iris and block fluid drainage, causing very high pressure, pain and redness. An emergency that needs urgent specialist care.',
  },
];

const SOURCES = [
  ['National Eye Institute — Diabetic Retinopathy (2025)', 'https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/diabetic-retinopathy'],
  ['National Eye Institute — Macular Edema (2025)', 'https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/macular-edema'],
  ['National Eye Institute — Glaucoma (2025)', 'https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma'],
  ['CDC — Vision Loss and Diabetes (2024)', 'https://www.cdc.gov/diabetes/diabetes-complications/diabetes-and-vision-loss.html'],
];

export default function DiseaseLibraryPage() {
  return (
    <Page width="max-w-5xl">
      <PageHeader
        eyebrow="Education"
        title="Diabetic eye disease library"
        description="Reference for staff and patients. The OpthaEdge model grades diabetic retinopathy only; the related conditions below need other examinations."
      />
      <div className="mt-6"><Notice>Educational content. Requires named clinician review before use as formal patient material.</Notice></div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-400">Diabetic retinopathy stages (graded by the model)</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {DR_GRADES.map((grade) => {
          const tone = GRADE_TONE_CLASSES[grade.tone];
          return (
            <article key={grade.index} className={`rounded-2xl border ${tone.border} bg-slate-900/65 p-5`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone.bg} ${tone.text}`}>Grade {grade.index} · {grade.label}</span>
                {grade.referable ? <Badge tone="rose">Referable</Badge> : <Badge tone="emerald">Screen</Badge>}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-100">{grade.clinicalName}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{grade.summary}</p>
              <p className="mt-3 text-xs font-medium text-slate-300">Typical next step: {grade.suggestedFollowUpText}</p>
            </article>
          );
        })}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-400">Related diabetic eye conditions (not detected by this model)</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {RELATED.map((item) => (
          <Card key={item.name} title={item.name} description={item.relation}>
            <p className="text-sm leading-relaxed text-slate-400">{item.text}</p>
          </Card>
        ))}
      </div>

      <Card title="Protecting vision with diabetes" className="mt-8">
        <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          {[
            'Dilated eye examination or retinal screening at least once a year',
            'Keep HbA1c, blood pressure and cholesterol at the targets set with your doctor',
            'Stop smoking',
            'Report any sudden change in vision the same day',
            'Extra eye checks during pregnancy if you have diabetes',
            'Take diabetes and blood-pressure medicines as prescribed',
          ].map((tip) => <li key={tip} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />{tip}</li>)}
        </ul>
      </Card>

      <section className="mt-8 text-xs text-slate-500">
        <h2 className="font-semibold text-slate-400">Sources</h2>
        <ul className="mt-2 space-y-1">{SOURCES.map(([title, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">{title}</a></li>)}</ul>
      </section>
    </Page>
  );
}
