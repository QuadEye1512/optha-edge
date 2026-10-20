import { redirect } from 'next/navigation';
import PasswordSignInForm from '@/components/auth/PasswordSignInForm';
import SyntheticSignInForm from '@/components/auth/SyntheticSignInForm';
import { getCurrentActor } from '@/lib/auth/authorization';
import { isSyntheticAuthEnabled } from '@/lib/auth/session';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentActor()) {
    redirect('/');
  }
  const { next } = await searchParams;
  const syntheticEnabled = isSyntheticAuthEnabled();

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.2 12s3.6-6 9.8-6 9.8 6 9.8 6-3.6 6-9.8 6-9.8-6-9.8-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </span>
          <span className="text-2xl font-bold tracking-tight text-white">Optha<span className="text-cyan-400">Edge</span></span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <h1 className="text-xl font-bold text-slate-100">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">Clinical staff only. Every access to patient records is audited.</p>
          <div className="mt-6">
            <PasswordSignInForm next={typeof next === 'string' ? next : ''} />
          </div>
          {syntheticEnabled ? (
            <div className="mt-6 border-t border-slate-800 pt-6">
              <p className="mb-3 text-xs leading-relaxed text-amber-200/80">Development only: sign in as the seeded synthetic clinician. Disabled automatically in production.</p>
              <SyntheticSignInForm />
            </div>
          ) : null}
        </div>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-600">
          Research software. AI screening results are not a diagnosis.
        </p>
      </div>
    </div>
  );
}
