import { redirect } from 'next/navigation';
import PatientCreateForm from '@/components/patients/PatientCreateForm';
import { listPatients } from '@/data/patients';
import { getCurrentActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';

interface PatientsPageProps {
  searchParams: Promise<{ q?: string; created?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect('/sign-in');
  }
  if (!hasPermission(actor, PERMISSIONS.PATIENT_READ)) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-rose-500/25 bg-rose-500/5 p-6 text-sm text-rose-200">
          Your active role does not grant permission to view patient records.
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const searchTerm = typeof params.q === 'string' ? params.q : '';
  const patients = await listPatients(actor, searchTerm);
  const canCreate = hasPermission(actor, PERMISSIONS.PATIENT_CREATE);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Patient management</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">Patients</h1>
            <p className="mt-2 text-sm text-slate-400">Organization-scoped synthetic records protected by database-backed permissions.</p>
          </div>
          <form className="flex w-full max-w-md gap-2" role="search">
            <label className="sr-only" htmlFor="patient-search">Search patients</label>
            <input id="patient-search" name="q" defaultValue={searchTerm} placeholder="Patient ID or name" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500" />
            <button className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700">Search</button>
          </form>
        </div>

        {params.created === '1' && (
          <p className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200" role="status">
            The synthetic patient record and audit event were created.
          </p>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/65">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-200">Authorized patient records</h2>
              <p className="mt-1 text-xs text-slate-500">Showing up to 50 active records from your organization.</p>
            </div>
            {patients.length ? (
              <ul className="divide-y divide-slate-800">
                {patients.map((patient) => (
                  <li key={patient.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{patient.displayName}</p>
                      <p className="mt-1 font-mono text-xs text-cyan-400">{patient.patientNumber}</p>
                    </div>
                    <div className="text-left text-xs text-slate-500 sm:text-right">
                      <p>{patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : 'DOB not recorded'}</p>
                      <p className="mt-1">{patient.sexAtBirth.replaceAll('_', ' ').toLowerCase()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid min-h-52 place-items-center px-6 text-center">
                <div>
                  <p className="text-sm font-medium text-slate-400">No matching patient records</p>
                  <p className="mt-1 text-xs text-slate-600">Create a synthetic record or change the search term.</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5">
            <h2 className="text-sm font-semibold text-slate-200">Add synthetic patient</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">This development workflow must not be used for real patient information.</p>
            <div className="mt-5">
              {canCreate ? (
                <PatientCreateForm />
              ) : (
                <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs text-amber-200">Your role does not grant patient creation permission.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

