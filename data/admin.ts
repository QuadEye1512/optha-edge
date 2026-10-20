import 'server-only';

import { UserStatus } from '@/generated/prisma/client';
import { recordAudit } from '@/lib/audit';
import { hashPassword } from '@/lib/auth/password';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { requirePermission, type AuthorizationActor } from '@/lib/auth/policy';
import { getPrisma } from '@/lib/db/prisma';
import { WorkflowError } from './examinations';

export async function listUsers(actor: AuthorizationActor) {
  requirePermission(actor, PERMISSIONS.ADMINISTRATION_MANAGE);
  const now = new Date();
  const [memberships, roles] = await Promise.all([
    getPrisma().organizationMembership.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { activeFrom: 'asc' },
      include: { user: true, role: { select: { id: true, code: true, name: true } } },
    }),
    getPrisma().role.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, description: true } }),
  ]);
  return {
    roles,
    users: memberships.map((membership) => ({
      membershipId: membership.id,
      userId: membership.user.id,
      displayName: membership.user.displayName,
      email: membership.user.email,
      status: membership.user.status,
      hasPassword: Boolean(membership.user.passwordHash),
      lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
      roleId: membership.role.id,
      roleName: membership.role.name,
      active: !membership.activeUntil || membership.activeUntil > now,
      isSelf: membership.user.id === actor.userId,
    })),
  };
}

export async function createUser(
  actor: AuthorizationActor,
  input: { displayName: string; email: string; roleId: string; password: string },
): Promise<void> {
  requirePermission(actor, PERMISSIONS.ADMINISTRATION_MANAGE);
  const prisma = getPrisma();
  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new WorkflowError('A user with that email already exists.');
  }
  const role = await prisma.role.findUnique({ where: { id: input.roleId }, select: { id: true } });
  if (!role) throw new WorkflowError('Select a valid role.');
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: { email, displayName: input.displayName, oidcSubject: `local|${email}`, status: UserStatus.ACTIVE, passwordHash },
      select: { id: true },
    });
    await transaction.organizationMembership.create({ data: { organizationId: actor.organizationId, userId: user.id, roleId: role.id } });
    await recordAudit(actor, { action: 'user.create', resourceType: 'User', resourceId: user.id, metadata: { roleId: role.id } }, transaction);
  });
}

async function membershipInScope(actor: AuthorizationActor, membershipId: string) {
  const membership = await getPrisma().organizationMembership.findFirst({
    where: { id: membershipId, organizationId: actor.organizationId },
    select: { id: true, userId: true },
  });
  if (!membership) throw new WorkflowError('User not found in this organization.');
  return membership;
}

export async function changeUserRole(actor: AuthorizationActor, membershipId: string, roleId: string): Promise<void> {
  requirePermission(actor, PERMISSIONS.ADMINISTRATION_MANAGE);
  const membership = await membershipInScope(actor, membershipId);
  if (membership.userId === actor.userId) throw new WorkflowError('You cannot change your own role.');
  const role = await getPrisma().role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) throw new WorkflowError('Select a valid role.');
  await getPrisma().organizationMembership.update({ where: { id: membership.id }, data: { roleId: role.id } });
  await recordAudit(actor, { action: 'user.role.change', resourceType: 'User', resourceId: membership.userId, metadata: { roleId } });
}

export async function setUserActive(actor: AuthorizationActor, membershipId: string, active: boolean): Promise<void> {
  requirePermission(actor, PERMISSIONS.ADMINISTRATION_MANAGE);
  const membership = await membershipInScope(actor, membershipId);
  if (membership.userId === actor.userId) throw new WorkflowError('You cannot deactivate your own account.');
  await getPrisma().$transaction([
    getPrisma().organizationMembership.update({ where: { id: membership.id }, data: { activeUntil: active ? null : new Date() } }),
    getPrisma().user.update({ where: { id: membership.userId }, data: { status: active ? UserStatus.ACTIVE : UserStatus.SUSPENDED } }),
  ]);
  await recordAudit(actor, { action: active ? 'user.activate' : 'user.suspend', resourceType: 'User', resourceId: membership.userId });
}

export async function resetUserPassword(actor: AuthorizationActor, membershipId: string, password: string): Promise<void> {
  requirePermission(actor, PERMISSIONS.ADMINISTRATION_MANAGE);
  const membership = await membershipInScope(actor, membershipId);
  await getPrisma().user.update({ where: { id: membership.userId }, data: { passwordHash: await hashPassword(password) } });
  await recordAudit(actor, { action: 'user.password.reset', resourceType: 'User', resourceId: membership.userId });
}

export async function listAuditEvents(actor: AuthorizationActor, take = 100) {
  requirePermission(actor, PERMISSIONS.AUDIT_READ);
  const events = await getPrisma().auditEvent.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { occurredAt: 'desc' },
    take,
    include: { actor: { select: { displayName: true } } },
  });
  return events.map((event) => ({
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    actor: event.actor?.displayName ?? 'Patient link / system',
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    outcome: event.outcome,
  }));
}
