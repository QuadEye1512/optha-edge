import { redirect } from 'next/navigation';
import SyntheticSignInForm from '@/components/auth/SyntheticSignInForm';
import { getCurrentActor } from '@/lib/auth/authorization';
import { isSyntheticAuthEnabled } from '@/lib/auth/session';

export default async function SignInPage() {
  if (await getCurrentActor()) {
    redirect('/patients');
  }

  const syntheticEnabled = isSyntheticAuthEnabled();

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Secure workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">Sign in to OpthaEdge</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Patient records require a verified identity, an active organization membership, and server-enforced permissions.
        </p>

        <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-100/80">
          The local option below uses only seeded synthetic records. It is disabled automatically in production and is not a substitute for the approved OIDC provider.
        </div>

        <div className="mt-6">
          {syntheticEnabled ? (
            <SyntheticSignInForm />
          ) : (
            <p className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
              No authentication provider is configured. Enable the synthetic provider only for local development or connect the approved production OIDC provider.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

