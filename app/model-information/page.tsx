import { MODEL_REGISTRY } from '@/lib/modelRegistry';

export default function ModelInformationPage() {
  const models = Object.values(MODEL_REGISTRY);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">AI governance</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">Model information</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
          This registry reports known technical facts and explicitly preserves missing evidence. Neither model is approved for clinical deployment.
        </p>

        <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-100/80">
          <span className="font-semibold text-amber-300">Validation blocker:</span> training configuration, verified label order, preprocessing provenance, calibration, threshold selection, validation datasets, performance metrics, confidence intervals, and subgroup evidence were not supplied.
        </div>

        <div className="mt-6 space-y-6">
          {models.map((model) => (
            <article key={model.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                  <p className="font-mono text-[11px] text-cyan-400">{model.id}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-100">{model.task}</h2>
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">{model.intendedUse}</p>
                </div>
                <span className="w-fit rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300">Blocked pending validation</span>
              </div>

              <div className="grid gap-px bg-slate-800 sm:grid-cols-2 xl:grid-cols-4">
                <div className="bg-slate-900 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-600">Artifact</p><p className="mt-2 break-all font-mono text-xs text-slate-300">{model.artifactFile}</p></div>
                <div className="bg-slate-900 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-600">Input</p><p className="mt-2 font-mono text-xs text-slate-300">{model.input.dimensions.join(' × ')} {model.input.colorFormat}</p></div>
                <div className="bg-slate-900 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-600">Output</p><p className="mt-2 font-mono text-xs text-slate-300">{model.output.dimensions.join(' × ')} logits</p></div>
                <div className="bg-slate-900 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-600">Preprocessing</p><p className="mt-2 font-mono text-xs text-slate-300">{model.preprocessingVersion}</p></div>
              </div>

              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current label assumption</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {model.output.labels.map((label, index) => <span key={label} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">{index}: {label}</span>)}
                  </div>
                  <p className="mt-3 text-xs text-amber-300">Label order is not verified from training records.</p>
                </section>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Known limitations</h3>
                  <ul className="mt-3 space-y-2">
                    {model.knownLimitations.map((limitation) => <li key={limitation} className="flex gap-2 text-xs leading-relaxed text-slate-400"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{limitation}</li>)}
                  </ul>
                </section>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
