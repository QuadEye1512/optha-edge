import 'server-only';

import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { z } from 'zod';

const SESSION_COOKIE = 'opthaedge_session';
const SESSION_ISSUER = 'opthaedge';
const SESSION_AUDIENCE = 'opthaedge-web';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

const sessionClaimsSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  oidcSubject: z.string().min(1),
});

export type SessionClaims = z.infer<typeof sessionClaimsSchema>;

function getSessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }

  return new TextEncoder().encode(secret);
}

export function isSyntheticAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
    && process.env.ENABLE_SYNTHETIC_AUTH === 'true';
}

export async function createSession(claims: SessionClaims): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(claims.oidcSubject)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSessionKey());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
    priority: 'high',
  });
}

export async function readSession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ['HS256'],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    return sessionClaimsSchema.parse(payload);
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

