import 'server-only';

import { isSyntheticAuthEnabled } from '@/lib/auth/session';
import { isDatabaseConfigured } from '@/lib/db/prisma';
import { isLlmConfigured, llmModel } from '@/lib/education/generate';
import { getEdgeHealth, getLocalHealth } from '@/lib/edge/client';
import { findStudentVariant } from '@/lib/modelRegistry';
import { isImageStoreConfigured } from '@/lib/storage/imageStore';

export interface ReadinessItem {
  label: string;
  ok: boolean;
  state: string;
  detail?: string;
}

export async function getSystemReadiness(): Promise<{ items: ReadinessItem[]; edge: Awaited<ReturnType<typeof getEdgeHealth>> }> {
  const [edge, local] = await Promise.all([getEdgeHealth(), getLocalHealth()]);
  const activeHealth = edge.ok ? edge.health : (local.ok ? local.health : null);
  const variant = activeHealth ? findStudentVariant(activeHealth.artifact_sha256) : null;

  const items: ReadinessItem[] = [
    {
      label: 'Raspberry Pi inference service',
      ok: edge.ok,
      state: edge.ok ? 'Online' : 'Disconnected',
      detail: edge.ok ? `${edge.health.model_file} · ${edge.health.preprocessing}` : 'Will auto-detect when connected',
    },
    {
      label: 'Laptop processing unit (Fallback)',
      ok: local.ok,
      state: local.ok ? 'Ready (Active fallback)' : 'Unavailable',
      detail: local.ok ? `${local.health.model_file} · ONNX Runtime` : local.error,
    },
    {
      label: 'Model artifact',
      ok: Boolean(variant),
      state: variant ? 'Registered' : (activeHealth ? 'Unregistered digest' : '—'),
      detail: activeHealth ? `sha256 ${activeHealth.artifact_sha256.slice(0, 16)}…` : undefined,
    },
    {
      label: 'Pi camera (20D lens imager)',
      ok: edge.ok && edge.health.camera.available,
      state: edge.ok ? (edge.health.camera.available ? 'Ready' : 'Not detected') : 'Requires Pi connection',
      detail: edge.ok && !edge.health.camera.available ? 'Upload or phone capture still works.' : undefined,
    },
    { label: 'Patient database', ok: isDatabaseConfigured(), state: isDatabaseConfigured() ? 'Configured' : 'Not configured' },
    { label: 'Encrypted image storage', ok: isImageStoreConfigured(), state: isImageStoreConfigured() ? 'AES-256-GCM' : 'Key missing' },
    {
      label: 'AI patient education (OpenRouter)',
      ok: isLlmConfigured(),
      state: isLlmConfigured() ? 'Configured' : 'Curated fallback only',
      detail: isLlmConfigured() ? llmModel() : 'Set OPENROUTER_API_KEY to enable',
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
