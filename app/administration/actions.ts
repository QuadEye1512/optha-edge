'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { changeUserRole, createUser, resetUserPassword, setUserActive } from '@/data/admin';
import { getCurrentActor } from '@/lib/auth/authorization';
import { passwordPolicyError } from '@/lib/auth/password';
import { errorState, failure, success, validationFailure, type FormState } from '@/lib/formState';

const SESSION_EXPIRED = 'Your session is missing or no longer active. Sign in again.';

const userSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter the full name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email.').max(200),
  roleId: z.string().min(1, 'Select a role.'),
  password: z.string(),
});

export async function createUserAction(_state: FormState, formData: FormData): Promise<FormState> {
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  const parsed = userSchema.safeParse({
    displayName: formData.get('displayName'),
    email: formData.get('email'),
    roleId: formData.get('roleId'),
    password: formData.get('password'),
  });
  if (!parsed.success) return validationFailure(parsed.error);
  const policy = passwordPolicyError(parsed.data.password);
  if (policy) return failure(policy);
  try {
    await createUser(actor, parsed.data);
  } catch (error) {
    return errorState(error, 'The user could not be created.');
  }
  revalidatePath('/administration');
  return success(`${parsed.data.displayName} can now sign in.`);
}

export async function changeRoleAction(membershipId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  try {
    await changeUserRole(actor, membershipId, String(formData.get('roleId') ?? ''));
  } catch (error) {
    return errorState(error);
  }
  revalidatePath('/administration');
  return success('Role updated.');
}

export async function setActiveAction(membershipId: string, active: boolean): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) return;
  await setUserActive(actor, membershipId, active);
  revalidatePath('/administration');
}

export async function resetPasswordAction(membershipId: string, _state: FormState, formData: FormData): Promise<FormState> {
  const actor = await getCurrentActor();
  if (!actor) return failure(SESSION_EXPIRED);
  const password = String(formData.get('password') ?? '');
  const policy = passwordPolicyError(password);
  if (policy) return failure(policy);
  try {
    await resetUserPassword(actor, membershipId, password);
  } catch (error) {
    return errorState(error);
  }
  return success('Password reset. Share it with the user securely.');
}
