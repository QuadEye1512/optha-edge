import type { PermissionCode } from './permissions.ts';

export interface AuthorizationActor {
  userId: string;
  organizationId: string;
  oidcSubject: string;
  displayName: string;
  roleNames: readonly string[];
  permissions: ReadonlySet<string>;
}

export class AuthorizationError extends Error {
  constructor(message = 'You are not authorized to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function hasPermission(
  actor: AuthorizationActor,
  permission: PermissionCode,
): boolean {
  return actor.permissions.has(permission);
}

export function requirePermission(
  actor: AuthorizationActor,
  permission: PermissionCode,
): void {
  if (!hasPermission(actor, permission)) {
    throw new AuthorizationError();
  }
}

export function requireOrganizationScope(
  actor: AuthorizationActor,
  resourceOrganizationId: string,
): void {
  if (actor.organizationId !== resourceOrganizationId) {
    throw new AuthorizationError();
  }
}
