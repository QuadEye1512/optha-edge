import { listExaminations } from '@/data/examinations';
import { recordAudit } from '@/lib/audit';
import { getCurrentActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { DR_GRADES } from '@/lib/dr/grades';

export const runtime = 'nodejs';

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  // Neutralise spreadsheet formula injection and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(): Promise<Response> {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor, PERMISSIONS.EXAMINATION_READ)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const rows = await listExaminations(actor, { take: 5000 });
  await recordAudit(actor, { action: 'report.export', resourceType: 'Examination', resourceId: 'csv', metadata: { rows: rows.length } });

  const header = ['examination_id', 'examined_at', 'patient_id', 'patient_name', 'eye', 'status', 'grade', 'grade_label', 'grade_source', 'ai_confidence', 'image_source'];
  const lines = rows.map((row) => [
    row.id,
    row.examinedAt,
    row.patientNumber,
    row.patientName,
    row.eye,
    row.status,
    row.grade,
    row.grade !== null ? DR_GRADES[row.grade].label : null,
    row.gradeSource,
    row.confidence !== null ? row.confidence.toFixed(4) : null,
    row.imageSource,
  ].map(csvCell).join(','));

  return new Response([header.join(','), ...lines].join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="opthaedge-examinations-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
