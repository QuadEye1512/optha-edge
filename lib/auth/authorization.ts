import 'server-only';

import { cache } from 'react';
import { UserStatus } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/db/prisma';
import type { AuthorizationActor } from './policy';
import { readSession } from './session';

export const getCurrentActor = cache(async (): Promise<AuthorizationActor | null> => {
  const session = await readSession();
  if (!session) {
    return null;
  }

  const now = new Date();
  const user = await getPrisma().user.findFirst({
    where: {
      id: session.userId,
      oidcSubject: session.oidcSubject,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      oidcSubject: true,
      displayName: true,
      memberships: {
        where: {
          organizationId: session.organizationId,
          activeFrom: { lte: now },
          OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
          organization: { status: 'ACTIVE' },
        },
        select: {
          organizationId: true,
          role: {
            select: {
              name: true,
              permissions: {
                select: { permission: { select: { code: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: session.organizationId,
    oidcSubject: user.oidcSubject,
    displayName: user.displayName,
    roleNames: [...new Set(user.memberships.map((membership) => membership.role.name))],
    permissions: new Set(
      user.memberships.flatMap((membership) =>
        membership.role.permissions.map(({ permission }) => permission.code),
      ),
    ),
  };
});

export interface ViewerDTO {
  displayName: string;
  roleNames: readonly string[];
}

export async function getViewerDTO(): Promise<ViewerDTO | null> {
  try {
    const actor = await getCurrentActor();
    return actor
      ? { displayName: actor.displayName, roleNames: actor.roleNames }
      : null;
  } catch {
    return null;
  }
}

