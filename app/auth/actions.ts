'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AuditOutcome, UserStatus } from '@/generated/prisma/client';
import { getCurrentActor } from '@/lib/auth/authorization';
import { verifyPassword } from '@/lib/auth/password';
import { consumeRateLimit, resetRateLimit } from '@/lib/auth/rateLimit';
import { createSession, deleteSession, isSyntheticAuthEnabled } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db/prisma';

export interface SignInState {
  message?: string;
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

function activeMembershipWhere(now: Date) {
  return {
    activeFrom: { lte: now },
    OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
    organization: { status: 'ACTIVE' as const },
  };
}

// Constant-time-ish path for unknown emails, so response timing does not reveal accounts.
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export async function signInWithPasswordAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = credentialsSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) {
    return { message: 'Enter your email and password.' };
  }
  const { email, password } = parsed.data;
  const requestHeaders = await headers();
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || 'local';
  const limitKey = `signin:${ip}:${email}`;
  const limit = consumeRateLimit(limitKey, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { message: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.` };
  }

  const now = new Date();
  const user = await getPrisma().user.findUnique({
    where: { email },
    select: {
      id: true,
      oidcSubject: true,
      status: true,
      passwordHash: true,
      memberships: { where: activeMembershipWhere(now), orderBy: { activeFrom: 'asc' }, take: 1, select: { organizationId: true } },
    },
  });

  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  const membership = user?.memberships[0];
  if (!user || !valid || user.status !== UserStatus.ACTIVE || !membership) {
    if (user && membership) {
      await getPrisma().auditEvent.create({
        data: {
          organizationId: membership.organizationId,
          actorUserId: user.id,
          action: 'session.sign_in',
          resourceType: 'Session',
          resourceId: user.id,
          outcome: AuditOutcome.DENIED,
        },
      });
    }
    return { message: 'Email or password is incorrect, or the account is inactive.' };
  }

  resetRateLimit(limitKey);
  await createSession({ userId: user.id, organizationId: membership.organizationId, oidcSubject: user.oidcSubject });
  await getPrisma().$transaction([
    getPrisma().user.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
    getPrisma().auditEvent.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: 'session.sign_in',
        resourceType: 'Session',
        resourceId: user.id,
        outcome: AuditOutcome.SUCCESS,
        metadata: { mode: 'password' },
      },
    }),
  ]);

  const next = String(formData.get('next') ?? '');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function signInSyntheticAction(previousState: SignInState): Promise<SignInState> {
  void previousState;
  if (!isSyntheticAuthEnabled()) {
    return { message: 'Local synthetic sign-in is disabled.' };
  }

  const oidcSubject = process.env.SYNTHETIC_AUTH_SUBJECT?.trim() || 'synthetic|clinician-reviewer';
  const now = new Date();
  const user = await getPrisma().user.findFirst({
    where: { oidcSubject, status: UserStatus.ACTIVE },
    select: {
      id: true,
      oidcSubject: true,
      memberships: { where: activeMembershipWhere(now), orderBy: { activeFrom: 'asc' }, take: 1, select: { organizationId: true } },
    },
  });

  const membership = user?.memberships[0];
  if (!user || !membership) {
    return { message: 'The seeded development identity or active membership was not found. Run npm run db:seed.' };
  }

  await createSession({ userId: user.id, organizationId: membership.organizationId, oidcSubject: user.oidcSubject });
  await getPrisma().auditEvent.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: 'session.sign_in',
      resourceType: 'Session',
      resourceId: user.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: { mode: 'synthetic-development' },
    },
  });

  redirect('/');
}

export async function signOutAction(): Promise<void> {
  const actor = await getCurrentActor();
  if (actor) {
    await getPrisma().auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: 'session.sign_out',
        resourceType: 'Session',
        resourceId: actor.userId,
        outcome: AuditOutcome.SUCCESS,
      },
    });
  }

  await deleteSession();
  redirect('/sign-in');
}
