import assert from 'node:assert/strict';
import test from 'node:test';
import { PERMISSIONS } from '../lib/auth/permissions.ts';
import {
  AuthorizationError,
  hasPermission,
  requireOrganizationScope,
  requirePermission,
  type AuthorizationActor,
} from '../lib/auth/policy.ts';

const actor: AuthorizationActor = {
  userId: 'user-a',
  organizationId: 'organization-a',
  oidcSubject: 'test|user-a',
  displayName: 'Synthetic User',
  roleNames: ['Clinical Operator'],
  permissions: new Set([PERMISSIONS.PATIENT_READ]),
};

test('grants only permissions carried by the verified actor', () => {
  assert.equal(hasPermission(actor, PERMISSIONS.PATIENT_READ), true);
  assert.equal(hasPermission(actor, PERMISSIONS.ADMINISTRATION_MANAGE), false);
  assert.doesNotThrow(() => requirePermission(actor, PERMISSIONS.PATIENT_READ));
  assert.throws(
    () => requirePermission(actor, PERMISSIONS.PATIENT_CREATE),
    AuthorizationError,
  );
});

test('rejects access to a resource owned by another organization', () => {
  assert.doesNotThrow(() => requireOrganizationScope(actor, 'organization-a'));
  assert.throws(
    () => requireOrganizationScope(actor, 'organization-b'),
    AuthorizationError,
  );
});
