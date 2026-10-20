import ExaminationTable from '@/components/examinations/ExaminationTable';
import { Card, Notice, Page, PageHeader } from '@/components/ui';
import { reviewQueue } from '@/data/examinations';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';

export default async function ReviewQueuePage() {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.REVIEW_SIGN)) {
    return <Page><Notice tone="rose">Only clinicians can sign reviews.</Notice></Page>;
  }
  const rows = await reviewQueue(actor);
  // Referable AI grades first, then oldest first.
  const ordered = [...rows].sort((a, b) => {
    const referableA = a.grade !== null && a.grade >= 2 ? 1 : 0;
    const referableB = b.grade !== null && b.grade >= 2 ? 1 : 0;
    return referableB - referableA || a.examinedAt.localeCompare(b.examinedAt);
  });

  return (
    <Page width="max-w-4xl">
      <PageHeader
        eyebrow="Clinician workflow"
        title="Review queue"
        description="AI results waiting for a clinician to confirm or override. Possible referable disease is listed first."
      />
      <div className="mt-6">
        <Card title={`${ordered.length} awaiting review`}>
          <ExaminationTable rows={ordered} empty="Nothing waiting — every screening has been reviewed." />
        </Card>
      </div>
    </Page>
  );
}
