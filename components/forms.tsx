'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/formState';
import { primaryButton } from './ui';

export function SubmitButton({
  children,
  pendingText = 'Saving…',
  className = primaryButton,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} name={name} value={value}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Generic form for a server action returning FormState. Usable directly from
 * server components: pass a (bound) server action and plain children. The form
 * resets after each successful submission.
 */
export function ActionForm({
  action,
  children,
  className = 'grid gap-4',
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} className={className} noValidate key={state.ok ? state.nonce : 'form'}>
      {children}
      {state.message ? (
        <p aria-live="polite" className={`text-xs sm:col-span-full ${state.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
