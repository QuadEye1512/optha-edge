import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const fallbackUrl = 'postgresql://opthaedge:opthaedge@127.0.0.1:5432/opthaedge?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // The fallback lets `prisma generate` run without a database. Migration and
    // runtime commands must use an explicitly configured DATABASE_URL.
    url: process.env.DATABASE_URL ?? fallbackUrl,
  },
});
