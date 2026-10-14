# OpthaEdge

OpthaEdge is a research-stage retinal screening and eye-care record platform built with Next.js 16, React 19, TypeScript, Prisma ORM, PostgreSQL, ONNX Runtime, and Sharp.

The included DR models are available for research workflow testing only. Their clinical validation packages have not been supplied, so the application must not be represented as an autonomous diagnostic system.

## Requirements

- Node.js 20.19+, 22.12+, or 24+ (Prisma ORM requirement)
- PostgreSQL 15 or newer
- npm

## Application setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Prisma and PostgreSQL setup

1. Create a PostgreSQL database and database user for OpthaEdge.
2. Copy `.env.example` to `.env`.
3. Replace the placeholder password and connection details in `DATABASE_URL`.
4. Validate and generate the Prisma client:

```bash
npm run db:validate
npm run db:generate
```

5. Create and apply the initial development migration:

```bash
npm run db:migrate -- --name initial_clinical_schema
```

6. Seed synthetic development data only:

```bash
npm run db:seed
```

7. Optionally inspect the database:

```bash
npm run db:studio
```

## Local authentication and patient records

The development workspace supports a signed, HTTP-only synthetic session that is
disabled automatically in production. Configure a unique `SESSION_SECRET` of at
least 32 characters, then set these values only in `.env.development.local`:

```env
ENABLE_SYNTHETIC_AUTH="true"
SYNTHETIC_AUTH_SUBJECT="synthetic|clinician-reviewer"
```

Run the synthetic seed before signing in. Open `/sign-in`, enter the synthetic
clinician workspace, and use `/patients` to search or create synthetic records.
Patient queries derive their organization from the verified server session, and
patient creation writes its audit event in the same database transaction.

Production deployment still requires an approved OIDC identity provider with
MFA/session-revocation support. The synthetic provider cannot run in production.

The seed is explicit and is never run automatically. It creates only clearly labeled synthetic records and keeps both model versions in `BLOCKED_PENDING_VALIDATION` status.

## Database structure

The initial normalized Prisma schema includes:

- Organizations, users, roles, permissions, and memberships.
- Patients, identifiers, demographics, contacts, consent, history, risk factors, measurements, medication, allergies, documents, and notes.
- Laterality-aware examinations, immutable image references, image-quality assessments, model versions, predictions, probabilities, lesion findings, and explainability assets.
- Deferred review and care-journey tables retained for migration safety; no Review Queue or Follow-up routes, permissions, or data services are active.
- Versioned educational content, medical sources, medical reviews, and audit events.

Database access belongs in server-only data-access modules. UI components must receive minimal DTOs rather than raw Prisma records.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The production build regenerates Prisma Client before compiling Next.js.

## Important limitations

- Authentication and role verification are not configured yet.
- A `DATABASE_URL` alone does not activate patient modules; migrations, authentication, resource authorization, storage, and audit workflows must also be completed.
- Retinal images require private encrypted object storage. They should not be placed directly in PostgreSQL or browser storage.
- No automated image-quality model is supplied.
- No additional ocular disease model is supplied or activated.
- Do not claim regulatory compliance without formal legal, privacy, security, and operational assessment.
