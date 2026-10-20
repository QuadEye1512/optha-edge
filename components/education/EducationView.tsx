import type { ReactNode } from 'react';
import type { EducationContent } from '@/lib/education/schema';

const EVIDENCE_TONE: Record<EducationContent['naturalRemedies'][number]['evidence'], string> = {
  strong: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  moderate: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  limited: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  traditional: 'border-slate-600 bg-slate-800 text-slate-300',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">{title}</h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Bullets({ items, tone = 'bg-cyan-400' }: { items: string[]; tone?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-300">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={index} className="text-sm leading-relaxed text-slate-300">{paragraph.trim()}</p>
      ))}
    </div>
  );
}

/** Renders patient education. Used by clinicians and on the patient's share page. */
export default function EducationView({ content }: { content: EducationContent }) {
  return (
    <div>
      <p className="text-lg font-semibold leading-snug text-slate-100">{content.headline}</p>

      <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-300">Get same-day eye care if you notice</p>
        <div className="mt-2"><Bullets items={content.warningSigns} tone="bg-rose-400" /></div>
      </div>

      <div className="mt-6">
        <Section title="What this means for you"><Paragraphs text={content.whatThisMeansForYou} /></Section>
        <Section title="About diabetic retinopathy"><Paragraphs text={content.conditionOverview} /></Section>
        {content.commonSymptoms.length ? <Section title="Symptoms"><Bullets items={content.commonSymptoms} /></Section> : null}

        {content.medicalCare.length ? (
          <Section title="Medical care your doctor may discuss">
            <div className="grid gap-2 sm:grid-cols-2">
              {content.medicalCare.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Natural remedies & how to take them">
          <p className="mb-3 text-xs text-slate-500">These support overall health alongside treatment. They do not cure retinopathy. Never stop prescribed medicine.</p>
          <div className="space-y-3">
            {content.naturalRemedies.map((remedy) => (
              <article key={remedy.name} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">{remedy.name}</h4>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${EVIDENCE_TONE[remedy.evidence]}`}>{remedy.evidence} evidence</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{remedy.howItMayHelp}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300"><span className="font-semibold text-cyan-300">How to take: </span>{remedy.howToConsume}</p>
                <p className="mt-2 text-xs leading-relaxed text-amber-200/80"><span className="font-semibold">Caution: </span>{remedy.cautions}</p>
              </article>
            ))}
          </div>
        </Section>

        {content.interactionWarnings.length ? (
          <Section title="Cautions with your medicines">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><Bullets items={content.interactionWarnings} tone="bg-amber-400" /></div>
          </Section>
        ) : null}

        <Section title="Diet plan">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="mb-2 text-xs font-semibold text-emerald-300">Eat more</p>
              <Bullets items={content.dietPlan.include} tone="bg-emerald-400" />
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="mb-2 text-xs font-semibold text-rose-300">Limit</p>
              <Bullets items={content.dietPlan.limit} tone="bg-rose-400" />
            </div>
          </div>
          {content.dietPlan.sampleDay.length ? (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <p className="mb-2 text-xs font-semibold text-slate-300">A sample day</p>
              <Bullets items={content.dietPlan.sampleDay} />
            </div>
          ) : null}
        </Section>

        <Section title="Daily habits"><Bullets items={content.lifestyle} /></Section>
        <Section title="Keep track of"><Bullets items={content.monitoring} /></Section>
        <Section title="Your next eye check"><p className="text-sm font-medium text-slate-200">{content.followUp}</p></Section>

        <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] leading-relaxed text-slate-500">{content.disclaimer}</p>
      </div>
    </div>
  );
}
