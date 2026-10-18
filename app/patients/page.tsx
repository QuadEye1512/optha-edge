import Link from 'next/link';
import PatientCreateForm from '@/components/patients/PatientCreateForm';
import { Badge, Card, EmptyState, GradeBadge, Notice, Page, PageHeader, secondaryButton } from '@/components/ui';
import { listPatients } from '@/data/patients';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { ageInYears, formatDate, humanizeEnum } from '@/lib/format';

interface PatientsPageProps {
  searchParams: Promise<{ q?: string; new?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.PATIENT_READ)) {
    return <Page><Notice tone="rose">Your role does not grant permission to view patient records.</Notice></Page>;
  }

  const params = await searchParams;
  const searchTerm = typeof params.q === 'string' ? params.q : '';
  const patients = await listPatients(actor, searchTerm);
  const canCreate = hasPermission(actor, PERMISSIONS.PATIENT_CREATE);
  const showForm = params.new === '1' || (!searchTerm && patients.length === 0);

  return (
    <Page>
      <PageHeader
        eyebrow="Patient management"
        title="Patients"
        description="Search by name, patient ID or mobile number. Open a patient to see their full eye-care history."
        actions={canCreate ? <Link href={showForm ? '/patients' : '/patients?new=1'} className={secondaryButton}>{showForm ? 'Hide form' : 'Register patient'}</Link> : null}
      />

      <form className="mt-6 flex gap-2" role="search">
        <label className="sr-only" htmlFor="patient-search">Search patients</label>
        <input id="patient-search" name="q" defaultValue={searchTerm} placeholder="Name, patient ID or mobile" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500" />
        <button className={secondaryButton}>Search</button>
      </form>

      <div className={`mt-6 grid gap-6 ${showForm && canCreate ? 'xl:grid-cols-[1.1fr_0.9fr]' : ''}`}>
        <Card title="Patient records" description={`${patients.length} shown${patients.length === 50 ? ' (refine the search to see more)' : ''}`}>
          {patients.length ? (
            <ul className="-my-2 divide-y divide-slate-800">
              {patients.map((patient) => {
                const age = ageInYears(patient.dateOfBirth);
                return (
                  <li key={patient.id}>
                    <Link href={`/patients/${patient.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-90">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">{patient.displayName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <span className="font-mono text-cyan-400/80">{patient.patientNumber}</span>
                          {age !== null ? ` · ${age} y` : ''} · {humanizeEnum(patient.sexAtBirth)}
                        </p>
                        {!patient.imageConsent ? <p className="mt-1"><Badge tone="amber">No imaging consent</Badge></p> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        {patient.lastExam ? (
                          <>
                            <GradeBadge grade={patient.lastExam.grade} source={patient.lastExam.gradeSource} />
                            <span className="text-[10px] text-slate-500">{formatDate(patient.lastExam.examinedAt)}</span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-600">Not screened</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No matching patients" description={searchTerm ? 'Try a different search term.' : 'Register the first patient to begin.'} />
          )}
        </Card>

        {showForm && canCreate ? (
          <Card title="Register patient" description="Use real details only on a secured deployment.">
            <PatientCreateForm />
          </Card>
        ) : null}
      </div>
    </Page>
  );
}
