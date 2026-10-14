import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import {
  ConsentPurpose,
  ConsentStatus,
  DiabetesType,
  ModelDeploymentStatus,
  PatientStatus,
  PredictionTask,
  PrismaClient,
  SexAtBirth,
  SmokingStatus,
  UserStatus,
} from '../generated/prisma/client.ts';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL must be configured before seeding.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PERMISSIONS = [
  'patient.read',
  'patient.create',
  'patient.update',
  'examination.read',
  'examination.create',
  'prediction.run',
  'administration.manage',
  'audit.read',
] as const;

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'opthaedge-demo-clinic' },
    update: { name: 'OpthaEdge Synthetic Demo Clinic' },
    create: {
      slug: 'opthaedge-demo-clinic',
      name: 'OpthaEdge Synthetic Demo Clinic',
      retentionPolicyKey: 'development-synthetic-only',
    },
  });

  const permissionRows = await Promise.all(
    PERMISSIONS.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, description: `Synthetic development permission: ${code}` },
      }),
    ),
  );

  const clinicianRole = await prisma.role.upsert({
    where: { code: 'clinician-reviewer' },
    update: {
      name: 'Clinical Operator',
      description: 'Manages authorized synthetic patient and screening workflows.',
    },
    create: {
      code: 'clinician-reviewer',
      name: 'Clinical Operator',
      description: 'Manages authorized synthetic patient and screening workflows.',
    },
  });

  await prisma.rolePermission.deleteMany({
    where: {
      roleId: clinicianRole.id,
      permission: {
        code: { in: ['review.read', 'review.sign', 'care-plan.manage'] },
      },
    },
  });

  await prisma.rolePermission.createMany({
    data: permissionRows
      .filter((permission) => permission.code !== 'administration.manage')
      .map((permission) => ({ roleId: clinicianRole.id, permissionId: permission.id })),
    skipDuplicates: true,
  });

  const syntheticUser = await prisma.user.upsert({
    where: { oidcSubject: 'synthetic|clinician-reviewer' },
    update: {
      displayName: 'Dr. Synthetic Clinician',
      status: UserStatus.ACTIVE,
    },
    create: {
      oidcSubject: 'synthetic|clinician-reviewer',
      email: 'clinician.synthetic@example.invalid',
      displayName: 'Dr. Synthetic Clinician',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId_roleId: {
        organizationId: organization.id,
        userId: syntheticUser.id,
        roleId: clinicianRole.id,
      },
    },
    update: { activeUntil: null },
    create: {
      organizationId: organization.id,
      userId: syntheticUser.id,
      roleId: clinicianRole.id,
    },
  });

  const patient = await prisma.patient.upsert({
    where: {
      organizationId_patientNumber: {
        organizationId: organization.id,
        patientNumber: 'DEMO-0001',
      },
    },
    update: { status: PatientStatus.ACTIVE },
    create: {
      organizationId: organization.id,
      patientNumber: 'DEMO-0001',
      status: PatientStatus.ACTIVE,
    },
  });

  await prisma.patientDemographics.upsert({
    where: { patientId: patient.id },
    update: {},
    create: {
      patientId: patient.id,
      givenName: 'Asha',
      familyName: 'Demo',
      preferredName: 'Asha',
      preferredLanguage: 'English',
      dateOfBirth: new Date('1979-02-12T00:00:00.000Z'),
      sexAtBirth: SexAtBirth.FEMALE,
    },
  });

  const existingHistory = await prisma.medicalHistory.findFirst({ where: { patientId: patient.id } });
  if (!existingHistory) {
    await prisma.medicalHistory.create({
      data: {
        patientId: patient.id,
        diabetesType: DiabetesType.TYPE_2,
        diabetesDiagnosedAt: new Date('2016-06-01T00:00:00.000Z'),
        smokingStatus: SmokingStatus.NEVER,
        recordedByUserId: syntheticUser.id,
        notes: 'Synthetic development record. Not a real patient.',
      },
    });
  }

  for (const purpose of [ConsentPurpose.IMAGE_PROCESSING, ConsentPurpose.DATA_RETENTION]) {
    const existingConsent = await prisma.consentRecord.findFirst({
      where: { patientId: patient.id, purpose, policyVersion: 'synthetic-dev-v1' },
    });
    if (!existingConsent) {
      await prisma.consentRecord.create({
        data: {
          organizationId: organization.id,
          patientId: patient.id,
          purpose,
          status: ConsentStatus.GRANTED,
          policyVersion: 'synthetic-dev-v1',
          capturedByUserId: syntheticUser.id,
        },
      });
    }
  }

  await prisma.modelVersion.upsert({
    where: { artifactSha256: 'dfc49e28bb3927ec47691320a12ae95d9af86b64bc16dd1240d56903d798f0d0' },
    update: {},
    create: {
      modelKey: 'opthaedge-dr-binary',
      version: 'sha256-dfc49e28bb39',
      artifactSha256: 'dfc49e28bb3927ec47691320a12ae95d9af86b64bc16dd1240d56903d798f0d0',
      task: PredictionTask.DR_BINARY,
      inputSpecification: { dimensions: [1, 3, 224, 224], colorFormat: 'RGB' },
      outputLabels: ['No DR', 'DR Detected'],
      preprocessingSpecification: { version: 'binary-imagenet-cover-224-v1' },
      decisionThresholds: { dr: 0.5, verified: false },
      intendedUse: 'Research-only binary screening support for color fundus photographs.',
      knownLimitations: ['Training provenance and clinical validation evidence were not supplied.'],
      deploymentStatus: ModelDeploymentStatus.BLOCKED_PENDING_VALIDATION,
    },
  });

  await prisma.modelVersion.upsert({
    where: { artifactSha256: 'a75ff338af12bb31b66e05403b4b8ab989ea7c2213aa42447642d6b348028836' },
    update: {},
    create: {
      modelKey: 'opthaedge-dr-severity-inceptionv3',
      version: 'sha256-a75ff338af12',
      artifactSha256: 'a75ff338af12bb31b66e05403b4b8ab989ea7c2213aa42447642d6b348028836',
      task: PredictionTask.DR_SEVERITY,
      inputSpecification: { dimensions: [1, 3, 299, 299], colorFormat: 'RGB' },
      outputLabels: ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'],
      preprocessingSpecification: { version: 'severity-inception-cover-299-v1' },
      intendedUse: 'Research-only five-level DR model-output review for color fundus photographs.',
      knownLimitations: ['Training provenance and clinical validation evidence were not supplied.'],
      deploymentStatus: ModelDeploymentStatus.BLOCKED_PENDING_VALIDATION,
    },
  });

  console.info('Seeded synthetic OpthaEdge development records.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
