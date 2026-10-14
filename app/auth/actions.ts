'use server';

import { AuditOutcome, UserStatus } from '@/generated/prisma/client';
import { getCurrentActor } from '@/lib/auth/authorization';
import { createSession, deleteSession, isSyntheticAuthEnabled } from '@/lib/auth/session';
import { getPrisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';

export interface SignInState {
  message?: string;
}

export async function signInSyntheticAction(
  previousState: SignInState,
): Promise<SignInState> {
  void previousState;
  if (!isSyntheticAuthEnabled()) {
    return { message: 'Local synthetic sign-in is disabled.' };
  }

  const oidcSubject = process.env.SYNTHETIC_AUTH_SUBJECT?.trim()
    || 'synthetic|clinician-reviewer';
  const now = new Date();
  const user = await getPrisma().user.findFirst({
    where: { oidcSubject, status: UserStatus.ACTIVE },
    select: {
      id: true,
      oidcSubject: true,
      memberships: {
        where: {
          activeFrom: { lte: now },
          OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
          organization: { status: 'ACTIVE' },
        },
        orderBy: { activeFrom: 'asc' },
        take: 1,
        select: { organizationId: true },
      },
    },
  });

  const membership = user?.memberships[0];
  if (!user || !membership) {
    return { message: 'The seeded development identity or active membership was not found.' };
  }

  await createSession({
    userId: user.id,
    organizationId: membership.organizationId,
    oidcSubject: user.oidcSubject,
  });

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

  redirect('/patients');
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
