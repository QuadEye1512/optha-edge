/**
 * Deferred modules remain represented in the database for migration safety, but
 * have no navigation, routes, data access, or user-facing activation.
 */
export const MODULES = {
  reviewQueue: false,
  followUps: false,
} as const;

