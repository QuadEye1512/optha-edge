import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import {
  ConsentPurpose,
  ConsentStatus,
  DiabetesType,
  MeasurementType,
  ModelDeploymentStatus,
  PatientStatus,
  PredictionTask,
  PrismaClient,
  SexAtBirth,
  SmokingStatus,
  UserStatus,
} from '../generated/prisma/client.ts';
import { hashPassword, passwordPolicyError } from '../lib/auth/password.ts';
import { ALL_PERMISSIONS, ROLE_TEMPLATES } from '../lib/auth/permissions.ts';
import { STUDENT_MODEL } from '../lib/modelRegistry.ts';

/**
 * Idempotent seed.
 *   Always:  organization, permissions, roles, model registry.
 *   Optional first administrator: SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (+ SEED_ADMIN_NAME).
 *   Optional synthetic demo data: SEED_DEMO_DATA=true (never on a real deployment).
 */
const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error('DATABASE_URL must be configured before seeding.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const ORG_SLUG = process.env.ORGANIZATION_SLUG?.trim() || 'opthaedge-demo-clinic';
const ORG_NAME = process.env.ORGANIZATION_NAME?.trim() || 'OpthaEdge Screening Clinic';

async function seedRoles() {
  const permissions = new Map<string, string>();
  for (const code of ALL_PERMISSIONS) {
    const row = await prisma.permission.upsert({ where: { code }, update: {}, create: { code, description: code } });
    permissions.set(code, row.id);
  }
  const roles = new Map<string, string>();
  for (const template of ROLE_TEMPLATES) {
    const role = await prisma.role.upsert({
      where: { code: template.code },
      update: { name: template.name, description: template.description },
      create: { code: template.code, name: template.name, description: template.description },
    });
    roles.set(template.code, role.id);
    // Role permissions exactly match the template.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: { notIn: template.permissions.map((code) => permissions.get(code)!) } } });
    await prisma.rolePermission.createMany({
      data: template.permissions.map((code) => ({ roleId: role.id, permissionId: permissions.get(code)! })),
      skipDuplicates: true,
    });
  }
  return roles;
}

async function seedModels() {
  for (const variant of STUDENT_MODEL.variants) {
    await prisma.modelVersion.upsert({
      where: { artifactSha256: variant.sha256 },
      update: { deploymentStatus: ModelDeploymentStatus.RESEARCH_ONLY },
      create: {
        modelKey: STUDENT_MODEL.id,
        version: `${variant.file}-sha256-${variant.sha256.slice(0, 12)}`,
        artifactSha256: variant.sha256,
        artifactStorageKey: `edge:${variant.file}`,
        task: PredictionTask.DR_SEVERITY,
        inputSpecification: { description: STUDENT_MODEL.input, inputName: 'input' },
        outputLabels: [...STUDENT_MODEL.labels],
        labelOrderVerified: true,
        preprocessingSpecification: { version: 'stage1-roi-224-v1', description: STUDENT_MODEL.preprocessing },
        preprocessingVerified: true,
        decisionThresholds: { grade: 'argmax', anyDr: '1 - P(No DR), argmax threshold', referable: 'P(Moderate)+P(Severe)+P(PDR)' },
        validationDataset: 'APTOS 2019 validation split (n=733)',
        validationMetrics: { ...STUDENT_MODEL.validation, accuracy: variant.accuracy, qwk: variant.qwk },
        intendedUse: 'Research-only AI-assisted 5-grade DR screening of colour fundus images; clinician confirmation required.',
        knownLimitations: [...STUDENT_MODEL.limitations],
        deploymentStatus: ModelDeploymentStatus.RESEARCH_ONLY,
      },
    });
  }
  // The earlier InceptionV3 / binary artifacts are no longer deployed.
  await prisma.modelVersion.updateMany({
    where: { modelKey: { in: ['opthaedge-dr-binary', 'opthaedge-dr-severity-inceptionv3'] } },
    data: { deploymentStatus: ModelDeploymentStatus.RETIRED },
  });
}

async function seedAdmin(organizationId: string, roles: Map<string, string>) {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  if (!email) return;
  const policy = passwordPolicyError(password);
  if (policy) throw new Error(`SEED_ADMIN_PASSWORD: ${policy}`);
  const user = await prisma.user.upsert({
    where: { email },
    update: { status: UserStatus.ACTIVE, passwordHash: await hashPassword(password) },
    create: {
      email,
      oidcSubject: `local|${email}`,
      displayName: process.env.SEED_ADMIN_NAME?.trim() || 'Administrator',
      status: UserStatus.ACTIVE,
      passwordHash: await hashPassword(password),
    },
  });
  await prisma.organizationMembership.upsert({
    where: { organizationId_userId_roleId: { organizationId, userId: user.id, roleId: roles.get('administrator')! } },
    update: { activeUntil: null },
    create: { organizationId, userId: user.id, roleId: roles.get('administrator')! },
  });
  console.info(`Administrator ready: ${email}`);
}

async function seedDemo(organizationId: string, roles: Map<string, string>) {
  const clinician = await prisma.user.upsert({
    where: { oidcSubject: 'synthetic|clinician-reviewer' },
    update: { displayName: 'Dr. Synthetic Clinician', status: UserStatus.ACTIVE },
    create: {
      oidcSubject: 'synthetic|clinician-reviewer',
      email: 'clinician.synthetic@example.invalid',
      displayName: 'Dr. Synthetic Clinician',
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.organizationMembership.upsert({
    where: { organizationId_userId_roleId: { organizationId, userId: clinician.id, roleId: roles.get('clinician-reviewer')! } },
    update: { activeUntil: null },
    create: { organizationId, userId: clinician.id, roleId: roles.get('clinician-reviewer')! },
  });

  const patient = await prisma.patient.upsert({
    where: { organizationId_patientNumber: { organizationId, patientNumber: 'DEMO-0001' } },
    update: { status: PatientStatus.ACTIVE },
    create: { organizationId, patientNumber: 'DEMO-0001', status: PatientStatus.ACTIVE },
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
  if (!(await prisma.medicalHistory.findFirst({ where: { patientId: patient.id } }))) {
    await prisma.medicalHistory.create({
      data: {
        patientId: patient.id,
        diabetesType: DiabetesType.TYPE_2,
        diabetesDiagnosedAt: new Date('2016-06-01T00:00:00.000Z'),
        smokingStatus: SmokingStatus.NEVER,
        recordedByUserId: clinician.id,
        notes: 'Synthetic development record. Not a real patient. Hypertension on treatment.',
      },
    });
  }
  if (!(await prisma.medication.findFirst({ where: { patientId: patient.id } }))) {
    await prisma.medication.createMany({
      data: [
        { patientId: patient.id, name: 'Metformin 500 mg', instructions: 'Twice daily after meals' },
        { patientId: patient.id, name: 'Glimepiride 1 mg', instructions: 'Once daily before breakfast' },
        { patientId: patient.id, name: 'Telmisartan 40 mg', instructions: 'Once daily' },
      ],
    });
  }
  if (!(await prisma.clinicalMeasurement.findFirst({ where: { patientId: patient.id } }))) {
    const now = Date.now();
    const month = 30 * 24 * 60 * 60 * 1000;
    await prisma.clinicalMeasurement.createMany({
      data: [
        ...[8.9, 8.4, 7.9, 7.6].map((value, index) => ({
          organizationId, patientId: patient.id, type: MeasurementType.HBA1C, value, unit: '%', observedAt: new Date(now - (3 - index) * 3 * month), recordedByUserId: clinician.id,
        })),
        { organizationId, patientId: patient.id, type: MeasurementType.SYSTOLIC_BLOOD_PRESSURE, value: 138, unit: 'mmHg', observedAt: new Date(now - month), recordedByUserId: clinician.id },
        { organizationId, patientId: patient.id, type: MeasurementType.DIASTOLIC_BLOOD_PRESSURE, value: 86, unit: 'mmHg', observedAt: new Date(now - month), recordedByUserId: clinician.id },
      ],
    });
  }
  for (const purpose of [ConsentPurpose.IMAGE_PROCESSING, ConsentPurpose.DATA_RETENTION]) {
    if (!(await prisma.consentRecord.findFirst({ where: { patientId: patient.id, purpose } }))) {
      await prisma.consentRecord.create({
        data: { organizationId, patientId: patient.id, purpose, status: ConsentStatus.GRANTED, policyVersion: 'synthetic-dev-v1', capturedByUserId: clinician.id },
      });
    }
  }
  console.info('Synthetic demo data ready (DEMO-0001, synthetic clinician).');
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: { slug: ORG_SLUG, name: ORG_NAME },
  });
  const roles = await seedRoles();
  await seedModels();
  await seedAdmin(organization.id, roles);
  if (process.env.SEED_DEMO_DATA === 'true' || process.env.ENABLE_SYNTHETIC_AUTH === 'true') {
    await seedDemo(organization.id, roles);
  }
  console.info(`Seeded organization "${ORG_NAME}", ${ROLE_TEMPLATES.length} roles and ${STUDENT_MODEL.variants.length} model artifacts.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
