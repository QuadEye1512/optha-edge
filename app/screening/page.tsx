import Link from 'next/link';
import ScreeningWorkspace from '@/components/screening/ScreeningWorkspace';
import { Badge, Card, EmptyState, Notice, Page, PageHeader, primaryButton, ResearchBanner, secondaryButton } from '@/components/ui';
import { getPatientSummary, listPatients } from '@/data/patients';
import { getInferenceHealth } from '@/lib/edge/client';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { ageInYears, humanizeEnum } from '@/lib/format';

export default async function ScreeningPage({ searchParams }: { searchParams: Promise<{ patientId?: string; q?: string }> }) {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.EXAMINATION_CREATE) || !hasPermission(actor, PERMISSIONS.PREDICTION_RUN)) {
    return <Page><Notice tone="rose">Your role cannot run screenings.</Notice></Page>;
  }
  const { patientId, q } = await searchParams;

  if (!patientId) {
    const patients = await listPatients(actor, q ?? '', 30);
    return (
      <Page width="max-w-3xl">
        <PageHeader eyebrow="New screening · step 1 of 2" title="Choose the patient" description="Screening requires active image-processing consent." />
        <form className="mt-6 flex gap-2" role="search">
          <input name="q" defaultValue={q ?? ''} placeholder="Name, patient ID or mobile" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500" />
          <button className={secondaryButton}>Search</button>
        </form>
        <div className="mt-4">
          <Card title="Patients">
            {patients.length ? (
              <ul className="-my-2 divide-y divide-slate-800">
                {patients.map((patient) => {
                  const age = ageInYears(patient.dateOfBirth);
                  return (
                    <li key={patient.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">{patient.displayName}</p>
                        <p className="text-xs text-slate-500"><span className="font-mono text-cyan-400/80">{patient.patientNumber}</span>{age !== null ? ` · ${age} y` : ''} · {humanizeEnum(patient.sexAtBirth)}</p>
                      </div>
                      {patient.imageConsent ? (
                        <Link href={`/screening?patientId=${patient.id}`} className={primaryButton}>Select</Link>
                      ) : (
                        <Link href={`/patients/${patient.id}#consent`}><Badge tone="amber">Consent needed</Badge></Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No patients found" action={<Link href="/patients?new=1" className={primaryButton}>Register patient</Link>} />
            )}
          </Card>
        </div>
      </Page>
    );
  }

  const [patient, inference] = await Promise.all([getPatientSummary(actor, patientId), getInferenceHealth()]);
  if (!patient) {
    return <Page><Notice tone="rose">Patient not found or archived. <Link href="/screening" className="underline">Choose another patient</Link>.</Notice></Page>;
  }
  const age = ageInYears(patient.dateOfBirth);

  return (
    <Page width="max-w-5xl">
      <Link href="/screening" className="text-xs font-medium text-slate-500 hover:text-slate-300">← Change patient</Link>
      <div className="mt-3">
        <PageHeader
          eyebrow="New screening · step 2 of 2"
          title={patient.displayName}
          description={<span><span className="font-mono text-cyan-400/80">{patient.patientNumber}</span>{age !== null ? ` · ${age} years` : ''} · {humanizeEnum(patient.sexAtBirth)}</span>}
        />
      </div>
      <div className="mt-5"><ResearchBanner /></div>
      {!patient.imageConsent ? (
        <div className="mt-5"><Notice tone="rose">Image-processing consent is not active. <Link href={`/patients/${patient.id}#consent`} className="underline">Record consent</Link> before screening.</Notice></div>
      ) : (
        <div className="mt-5">
          <ScreeningWorkspace
            patientId={patient.id}
            device={inference.ok
              ? {
                  online: true,
                  backend: inference.backend,
                  camera: inference.camera,
                  model: inference.health.model_file,
                  detail: inference.backend === 'edge'
                    ? inference.health.camera.detail
                    : 'Raspberry Pi is not connected. Automatically processing using laptop CPU/GPU.',
                }
              : {
                  online: false,
                  backend: 'none',
                  camera: false,
                  model: null,
                  detail: inference.error,
                }}
          />
        </div>
      )}
    </Page>
  );
}
