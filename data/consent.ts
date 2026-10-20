import 'server-only';

import { ConsentPurpose, ConsentStatus, type Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/db/prisma';

type ConsentClient = Pick<Prisma.TransactionClient, 'consentRecord'>;

/** The most recent record for a purpose decides; it must be granted, unrevoked and unexpired. */
export async function hasActiveConsent(
  organizationId: string,
  patientId: string,
  purpose: ConsentPurpose,
  client: ConsentClient = getPrisma(),
): Promise<boolean> {
  const latest = await client.consentRecord.findFirst({
    where: { organizationId, patientId, purpose },
    orderBy: { capturedAt: 'desc' },
    select: { status: true, revokedAt: true, expiresAt: true },
  });
  if (!latest || latest.status !== ConsentStatus.GRANTED || latest.revokedAt) {
    return false;
  }
  return !latest.expiresAt || latest.expiresAt > new Date();
}

export const CONSENT_POLICY_VERSION = 'opthaedge-consent-v1';
export { ConsentPurpose };
