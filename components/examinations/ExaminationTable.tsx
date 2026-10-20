import Link from 'next/link';
import { EmptyState, GradeBadge } from '@/components/ui';
import type { ExaminationListItem } from '@/data/examinations';
import { formatDateTime, humanizeEnum, percent } from '@/lib/format';

export default function ExaminationTable({ rows, empty }: { rows: ExaminationListItem[]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <ul className="-my-2 divide-y divide-slate-800">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={`/examinations/${row.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 hover:opacity-90">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-200">{row.patientName}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="font-mono text-cyan-400/80">{row.patientNumber}</span> · {humanizeEnum(row.eye)} eye · {formatDateTime(row.examinedAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <GradeBadge grade={row.grade} source={row.gradeSource} />
              <span className="text-[10px] text-slate-500">
                {humanizeEnum(row.status)}{row.gradeSource === 'ai' && row.confidence !== null ? ` · p=${percent(row.confidence, 0)}` : ''}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
