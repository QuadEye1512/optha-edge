import { Badge, Card, Notice, Page, PageHeader } from '@/components/ui';
import { getEdgeHealth } from '@/lib/edge/client';
import { STUDENT_MODEL } from '@/lib/modelRegistry';

export default async function ModelInformationPage() {
  const edge = await getEdgeHealth();
  const activeSha = edge.ok ? edge.health.artifact_sha256 : null;
  const m = STUDENT_MODEL;

  return (
    <Page width="max-w-6xl">
      <PageHeader
        eyebrow="AI governance"
        title="Model information"
        description="Registry record for the model deployed on the Raspberry Pi. Every stored prediction references the artifact digest and preprocessing version."
      />
      <div className="mt-6"><Notice><span className="font-semibold text-amber-300">Status: research only.</span> Remains research-only until calibration, threshold selection, confidence intervals, subgroup results and external validation (including 20D-lens Pi images) are on record.</Notice></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title={m.task} description={<span className="font-mono">{m.id}</span>}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Architecture', 'Distilled student: MobileNetV3-Large + Lightweight CBAM'],
              ['Training', m.training],
              ['Input', m.input],
              ['Output', m.output],
              ['Preprocessing', m.preprocessing],
              ['Quality gate', m.qualityGate],
              ['DR / non-DR mode', m.binaryMode],
              ['Runtime', 'ONNX Runtime (CPU, 4 threads) in a FastAPI service on the Pi; the web platform never runs the model.'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-slate-300">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Labels (verified order)</h3>
          <div className="mt-2 flex flex-wrap gap-2">{m.labels.map((label, index) => <Badge key={label}>{index}: {label}</Badge>)}</div>
        </Card>

        <div className="space-y-6">
          <Card title="Validation (APTOS 2019 split)" description={`n = ${m.validation.n}`}>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Accuracy', m.validation.accuracy],
                ['QWK', m.validation.qwk],
                ['Macro-AUC', m.validation.macroAuc],
                ['Macro-F1', m.validation.macroF1],
                ['OCS', m.validation.ocs],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/30 p-2.5">
                  <dt className="text-[10px] text-slate-500">{label}</dt>
                  <dd className="mt-1 font-mono text-sm text-slate-100">{Number(value).toFixed(3)}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Deployable artifacts">
            <ul className="space-y-3">
              {m.variants.map((variant) => (
                <li key={variant.file} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-200">{variant.file}</span>
                    {activeSha === variant.sha256 ? <Badge tone="emerald">Active on Pi</Badge> : <Badge>{variant.sizeMb} MB</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Accuracy {variant.accuracy} · QWK {variant.qwk}</p>
                  <p className="mt-1 break-all font-mono text-[10px] text-slate-600">sha256 {variant.sha256}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Choose FP32 if its latency on the Pi is acceptable (≈3 points more accurate); INT8 only if clearly faster or memory-bound. Switch with MODEL_PATH on the Pi.</p>
          </Card>
        </div>

        <Card title="Known limitations" className="lg:col-span-2">
          <ul className="grid gap-2 sm:grid-cols-2">
            {m.limitations.map((limitation) => (
              <li key={limitation} className="flex gap-2 text-xs leading-relaxed text-slate-400"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{limitation}</li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
