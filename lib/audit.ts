import 'server-only';

import { AuditOutcome, type Prisma } from '@/generated/prisma/client';
import type { AuthorizationActor } from '@/lib/auth/policy';
import { getPrisma } from '@/lib/db/prisma';

type AuditClient = Pick<Prisma.TransactionClient, 'auditEvent'>;

export interface AuditInput {
  action: string;
  resourceType: string;
  resourceId: string;
  outcome?: AuditOutcome;
  /** Never put names, free-text clinical notes or images here. */
  metadata?: Prisma.InputJsonValue;
}

export async function recordAudit(
  actor: Pick<AuthorizationActor, 'organizationId' | 'userId'>,
  input: AuditInput,
  client: AuditClient = getPrisma(),
): Promise<void> {
  await client.auditEvent.create({
    data: {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      outcome: input.outcome ?? AuditOutcome.SUCCESS,
      metadata: input.metadata,
    },
  });
}
