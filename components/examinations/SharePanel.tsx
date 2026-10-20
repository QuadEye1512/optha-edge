'use client';

import QRCode from 'qrcode';
import { useActionState, useEffect, useState } from 'react';
import { createShareLinkAction, type ShareState } from '@/app/examinations/actions';
import { SubmitButton } from '@/components/forms';
import { secondaryButton } from '@/components/ui';

export default function SharePanel({ examinationId, patientPhone }: { examinationId: string; patientPhone: string | null }) {
  const [state, action] = useActionState(createShareLinkAction.bind(null, examinationId), {} as ShareState);
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!state.url) return;
    let cancelled = false;
    const absolute = new URL(state.url, window.location.origin).toString();
    QRCode.toDataURL(absolute, { margin: 1, width: 240, color: { dark: '#020617', light: '#ffffff' } })
      .then((dataUrl) => { if (!cancelled) setQr({ url: absolute, dataUrl }); })
      .catch(() => { if (!cancelled) setQr({ url: absolute, dataUrl: '' }); });
    return () => { cancelled = true; };
  }, [state.url]);

  if (!state.url) {
    return (
      <form action={action} className="grid gap-2">
        <p className="text-xs text-slate-500">Creates a private link the patient can open on their phone. It shows the clinician-confirmed result and education only, and expires in 14 days.</p>
        <div><SubmitButton pendingText="Creating link…">Create patient link</SubmitButton></div>
        {state.message ? <p className="text-xs text-amber-300">{state.message}</p> : null}
      </form>
    );
  }

  const url = qr?.url ?? state.url;
  const text = `Your OpthaEdge eye screening report: ${url}`;
  const phone = patientPhone?.replace(/[^\d]/g, '');
  const whatsapp = `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`;

  return (
    <div className="grid gap-3">
      {qr?.dataUrl ? (
        // Data URL generated in the browser; next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr.dataUrl} alt="QR code for the patient report link" className="h-44 w-44 rounded-xl bg-white p-2" />
      ) : null}
      <p className="break-all rounded-xl border border-slate-800 bg-slate-950/40 p-3 font-mono text-[11px] text-cyan-300">{url}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButton}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a href={whatsapp} target="_blank" rel="noreferrer" className={secondaryButton}>Send on WhatsApp</a>
        {phone ? <a href={`sms:${patientPhone}?body=${encodeURIComponent(text)}`} className={secondaryButton}>SMS</a> : null}
      </div>
      <p className="text-[11px] text-slate-500">The patient can scan the QR code with their phone camera. Expires {state.expiresAt ? new Date(state.expiresAt).toLocaleDateString() : 'in 14 days'}.</p>
    </div>
  );
}
