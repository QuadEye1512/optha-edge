import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not configured.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

type PrismaGlobal = typeof globalThis & {
  opthaEdgePrisma?: PrismaClient;
  opthaEdgeDatabaseUrl?: string;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new DatabaseNotConfiguredError();
  }

  if (
    !prismaGlobal.opthaEdgePrisma ||
    prismaGlobal.opthaEdgeDatabaseUrl !== connectionString
  ) {
    const adapter = new PrismaPg({ connectionString });
    prismaGlobal.opthaEdgePrisma = new PrismaClient({ adapter });
    prismaGlobal.opthaEdgeDatabaseUrl = connectionString;
  }

  return prismaGlobal.opthaEdgePrisma;
}
