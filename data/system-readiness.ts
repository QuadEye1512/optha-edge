import 'server-only';

import { isSyntheticAuthEnabled } from '@/lib/auth/session';
import { isDatabaseConfigured } from '@/lib/db/prisma';
import { isLlmConfigured } from '@/lib/education/generate';
import { getEdgeHealth } from '@/lib/edge/client';
import { findStudentVariant } from '@/lib/modelRegistry';
import { isImageStoreConfigured } from '@/lib/storage/imageStore';

export interface ReadinessItem {
  label: string;
  ok: boolean;
  state: string;
  detail?: string;
}

export async function getSystemReadiness(): Promise<{ items: ReadinessItem[]; edge: Awaited<ReturnType<typeof getEdgeHealth>> }> {
  const edge = await getEdgeHealth();
  const variant = edge.ok ? findStudentVariant(edge.health.artifact_sha256) : null;
  const items: ReadinessItem[] = [
    {
      label: 'Raspberry Pi inference service',
      ok: edge.ok,
      state: edge.ok ? 'Online' : 'Unavailable',
      detail: edge.ok ? `${edge.health.model_file} · ${edge.health.preprocessing}` : edge.error,
    },
    {
      label: 'Model artifact',
      ok: Boolean(variant),
      state: edge.ok ? (variant ? 'Registered' : 'Unregistered digest') : '—',
      detail: edge.ok ? `sha256 ${edge.health.artifact_sha256.slice(0, 16)}…` : undefined,
    },
    {
      label: 'Pi camera (20D lens imager)',
      ok: edge.ok && edge.health.camera.available,
      state: edge.ok ? (edge.health.camera.available ? 'Ready' : 'Not detected') : '—',
      detail: edge.ok && !edge.health.camera.available ? 'Upload or phone capture still works.' : undefined,
    },
    { label: 'Patient database', ok: isDatabaseConfigured(), state: isDatabaseConfigured() ? 'Configured' : 'Not configured' },
    { label: 'Encrypted image storage', ok: isImageStoreConfigured(), state: isImageStoreConfigured() ? 'AES-256-GCM' : 'Key missing' },
    {
      label: 'AI patient education (Claude)',
      ok: isLlmConfigured(),
      state: isLlmConfigured() ? 'Configured' : 'Curated fallback only',
    },
    {
      label: 'Inference service key',
      ok: Boolean(process.env.INFERENCE_API_KEY?.trim()),
      state: process.env.INFERENCE_API_KEY?.trim() ? 'Shared key set' : 'Not set (localhost only)',
    },
    {
      label: 'Authentication',
      ok: !isSyntheticAuthEnabled(),
      state: isSyntheticAuthEnabled() ? 'Password + synthetic dev' : 'Password',
    },
  ];
  return { items, edge };
}
