import ModulePlaceholder from '@/components/ModulePlaceholder';
import { MODULES } from '@/config/modules';
import { notFound } from 'next/navigation';

export default function FollowUpsPage() {
  if (!MODULES.followUps) {
    notFound();
  }

  return <ModulePlaceholder eyebrow="Care journey" title="Follow-ups" description="Track referral status, care plans, appointments, treatment history, due dates, and completion without deriving clinical urgency from model confidence alone." requirements={['Clinician-approved care protocol', 'Patient and examination persistence', 'Referral and appointment ownership model', 'Notification consent and delivery provider']} />;
}
