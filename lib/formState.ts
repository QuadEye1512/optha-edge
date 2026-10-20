import type { ZodError } from 'zod';

export interface FormState {
  ok?: boolean;
  message?: string;
  nonce?: string;
}

export function success(message: string): FormState {
  return { ok: true, message, nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

export function failure(message: string): FormState {
  return { ok: false, message };
}

export function validationFailure(error: ZodError): FormState {
  const issue = error.issues[0];
  return failure(issue ? issue.message : 'Check the form and try again.');
}

/** Maps known domain errors to a user message; logs and hides anything unexpected. */
export function errorState(error: unknown, fallback = 'The change could not be saved.'): FormState {
  if (error instanceof Error && ['AuthorizationError', 'WorkflowError', 'PatientNotFoundError', 'ConsentRequiredError', 'PatientNumberConflictError'].includes(error.name)) {
    return failure(error.message);
  }
  console.error('[OpthaEdge] Action failed.', error instanceof Error ? error.message : error);
  return failure(fallback);
}
