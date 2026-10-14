'use client';

import { useActionState } from 'react';
import { signInSyntheticAction, type SignInState } from '@/app/auth/actions';

const initialState: SignInState = {};

export default function SyntheticSignInForm() {
  const [state, action, pending] = useActionState(signInSyntheticAction, initialState);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Use synthetic clinician workspace'}
      </button>
      <p aria-live="polite" className="mt-3 text-xs text-amber-300">
        {state?.message}
      </p>
    </form>
  );
}

