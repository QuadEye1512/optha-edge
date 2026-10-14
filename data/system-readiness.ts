import 'server-only';

import { isDatabaseConfigured } from '@/lib/db/prisma';
import { isSyntheticAuthEnabled } from '@/lib/auth/session';

export interface SystemReadinessDTO {
  authentication: {
    mode: 'synthetic-development' | 'not-configured';
    productionReady: false;
  };
  database: {
    provider: 'Prisma ORM with PostgreSQL';
    configured: boolean;
    connectionVerified: false;
  };
}

export async function getSystemReadinessDTO(): Promise<SystemReadinessDTO> {
  return {
    authentication: {
      mode: isSyntheticAuthEnabled() ? 'synthetic-development' : 'not-configured',
      productionReady: false,
    },
    database: {
      provider: 'Prisma ORM with PostgreSQL',
      configured: isDatabaseConfigured(),
      // Connectivity is intentionally not tested during rendering or builds.
      connectionVerified: false,
    },
  };
}
