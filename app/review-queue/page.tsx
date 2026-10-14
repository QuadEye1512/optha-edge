import ModulePlaceholder from '@/components/ModulePlaceholder';
import { MODULES } from '@/config/modules';
import { notFound } from 'next/navigation';

export default function ReviewQueuePage() {
  if (!MODULES.reviewQueue) {
    notFound();
  }

  return <ModulePlaceholder eyebrow="Clinician workflow" title="Review Queue" description="Authorized clinicians will review original images and AI outputs, record independent conclusions, sign reviews, and preserve amendments." requirements={['Clinician role and credential verification', 'Approved review and referral protocol', 'Signed-review locking and amendment history', 'Separation of AI findings from clinician conclusions']} />;
}
