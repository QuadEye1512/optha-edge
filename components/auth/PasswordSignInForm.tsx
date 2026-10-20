'use client';

import { useActionState } from 'react';
import { signInWithPasswordAction, type SignInState } from '@/app/auth/actions';
import { inputClass, labelClass, primaryButton } from '@/components/ui';

const initialState: SignInState = {};

export default function PasswordSignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInWithPasswordAction, initialState);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className={labelClass}>
        Email
        <input className={inputClass} name="email" type="email" autoComplete="username" inputMode="email" required />
      </label>
      <label className={labelClass}>
        Password
        <input className={inputClass} name="password" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={pending} className={`${primaryButton} w-full py-3`}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      <p aria-live="polite" className="min-h-4 text-xs text-amber-300">{state.message}</p>
    </form>
  );
}
