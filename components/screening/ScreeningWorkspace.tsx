'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ScreeningApiResponse } from '@/app/api/screenings/route';
import { Badge, Notice, primaryButton, secondaryButton } from '@/components/ui';

interface DeviceState {
  online: boolean;
  camera: boolean;
  model: string | null;
  detail: string | null | undefined;
}

type Source = 'pi-camera' | 'upload';
type Eye = 'RIGHT' | 'LEFT';

const REASONS: Record<string, string> = {
  BLURRY: 'Image is blurred — refocus the 20D lens and hold steady.',
  TOO_DARK: 'Image is too dark — increase illumination or dilate the pupil.',
  TOO_BRIGHT: 'Image is over-exposed — reduce glare or illumination.',
};

export default function ScreeningWorkspace({ patientId, device }: { patientId: string; device: DeviceState }) {
  const router = useRouter();
  const [eye, setEye] = useState<Eye>('RIGHT');
  const [source, setSource] = useState<Source>(device.camera ? 'pi-camera' : 'upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ungradable, setUngradable] = useState<ScreeningApiResponse | null>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [streamOn, setStreamOn] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseFile(selected: File | null) {
    setError(null);
    setUngradable(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function run() {
    setBusy(true);
    setError(null);
    setUngradable(null);
    const body = new FormData();
    body.append('patientId', patientId);
    body.append('eye', eye);
    body.append('source', source);
    if (source === 'upload' && file) body.append('image', file);
    try {
      setStreamOn(false); // release the camera for the still capture
      const response = await fetch('/api/screenings', { method: 'POST', body });
      const data = (await response.json()) as ScreeningApiResponse;
      if (!data.ok) {
        setError(data.message ?? 'Screening failed.');
      } else if (!data.gradable) {
        setUngradable(data);
      } else {
        router.push(`/examinations/${data.examinationId}?new=1`);
        return;
      }
    } catch {
      setError('Network error — check the connection to the OpthaEdge server.');
    }
    setBusy(false);
  }

  const canRun = device.online && !busy && (source === 'pi-camera' ? device.camera : Boolean(file));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-200">1. Which eye?</h2>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Eye">
            {(['RIGHT', 'LEFT'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={eye === option}
                onClick={() => setEye(option)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${eye === option ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 bg-slate-950/40 text-slate-400'}`}
              >
                {option === 'RIGHT' ? 'Right eye (OD)' : 'Left eye (OS)'}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-200">2. Capture the retina</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSource('pi-camera')} disabled={!device.camera}
              className={`rounded-xl border px-3 py-3 text-left text-xs transition disabled:opacity-40 ${source === 'pi-camera' ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 bg-slate-950/40 text-slate-400'}`}>
              <span className="block text-sm font-semibold">Pi camera</span>
              Capture through the 20D lens on the device
            </button>
            <button type="button" onClick={() => setSource('upload')}
              className={`rounded-xl border px-3 py-3 text-left text-xs transition ${source === 'upload' ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-700 bg-slate-950/40 text-slate-400'}`}>
              <span className="block text-sm font-semibold">Phone / upload</span>
              Take a photo or choose a fundus image
            </button>
          </div>

          {source === 'pi-camera' ? (
            <div className="mt-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-700 bg-black">
                {streamOn ? (
                  // MJPEG stream proxied from the Pi; next/image cannot render multipart streams.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={streamKey} src={`/api/device/preview?k=${streamKey}`} alt="Live Pi camera view for aligning the 20D lens" className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center text-xs text-slate-500">
                    <div>
                      <p>Start the live view to align the 20D lens and focus on the retina.</p>
                      <button type="button" className={`${secondaryButton} mt-3`} onClick={() => { setStreamOn(true); setStreamKey((k) => k + 1); }}>Start live view</button>
                    </div>
                  </div>
                )}
              </div>
              {streamOn ? (
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>Live view pauses after 2 minutes.</span>
                  <button type="button" className="text-cyan-400" onClick={() => setStreamKey((k) => k + 1)}>Restart</button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              {preview ? (
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-black">
                  <div className="relative aspect-square max-h-96">
                    <Image src={preview} alt="Selected retinal image" fill unoptimized className="object-contain" sizes="(min-width: 1024px) 50vw, 100vw" />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-3 py-2 text-xs text-slate-400">
                    <span className="truncate">{file?.name}</span>
                    <button type="button" className="text-rose-300" onClick={() => chooseFile(null)} disabled={busy}>Remove</button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" className={`${secondaryButton} py-6`} onClick={() => cameraInput.current?.click()}>Take photo</button>
                  <button type="button" className={`${secondaryButton} py-6`} onClick={() => fileInput.current?.click()}>Choose image</button>
                </div>
              )}
              <input ref={cameraInput} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              <input ref={fileInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              <p className="mt-2 text-[11px] text-slate-600">JPEG or PNG, up to 15 MB. The image is processed on the Raspberry Pi, not in the browser.</p>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">Edge device</h2>
            <Badge tone={device.online ? 'emerald' : 'rose'}>{device.online ? 'Pi online' : 'Pi offline'}</Badge>
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Model</dt><dd className="font-mono text-slate-300">{device.model ?? '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Camera</dt><dd className="text-slate-300">{device.camera ? 'Ready' : 'Not available'}</dd></div>
          </dl>
          {!device.online ? <p className="mt-3 text-xs text-rose-200/80">{device.detail ?? 'The inference service is not reachable.'} Screening is unavailable — no result will be invented.</p> : null}
        </section>

        <button type="button" onClick={run} disabled={!canRun} className={`${primaryButton} w-full py-4 text-base`}>
          {busy ? 'Processing on Raspberry Pi…' : source === 'pi-camera' ? 'Capture & analyse' : 'Analyse image'}
        </button>

        {error ? <Notice tone="rose">{error}</Notice> : null}
        {ungradable ? (
          <Notice>
            <p className="font-semibold text-amber-300">Image quality too low — please recapture.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {(ungradable.quality?.reasons ?? []).map((reason) => <li key={reason}>{REASONS[reason] ?? reason}</li>)}
            </ul>
            <p className="mt-2 text-amber-100/60">Sharpness {ungradable.quality?.sharpness} · brightness {ungradable.quality?.brightness}. The attempt was recorded without a grade.</p>
          </Notice>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-[11px] leading-relaxed text-slate-500">
          <p className="font-semibold text-slate-400">Capture tips (20D lens)</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Dilate the pupil when possible; dim the room lights.</li>
            <li>Hold the 20D lens about 5 cm from the eye, then move the camera back until the retina fills the lens.</li>
            <li>Centre the optic disc and macula; avoid reflections on the lens surface.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
