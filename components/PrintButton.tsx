'use client';

import { primaryButton } from './ui';

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className={primaryButton}>Print / save PDF</button>;
}
