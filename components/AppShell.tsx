'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOutAction } from '@/app/auth/actions';
import type { ViewerDTO } from '@/lib/auth/authorization';

type IconName = 'home' | 'users' | 'camera' | 'list' | 'check' | 'calendar' | 'book' | 'chart' | 'cog' | 'chip';

const ICONS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.87M13 4.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  calendar: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  book: 'M12 6.25C10.5 5 8.5 4.5 6 4.5c-1 0-2 .1-3 .4v14c1-.3 2-.4 3-.4 2.5 0 4.5.5 6 1.75m0-14c1.5-1.25 3.5-1.75 6-1.75 1 0 2 .1 3 .4v14c-1-.3-2-.4-3-.4-2.5 0-4.5.5-6 1.75m0-14v14',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  cog: 'M10.3 4.3a1.7 1.7 0 0 1 3.4 0 1.7 1.7 0 0 0 2.6 1.1 1.7 1.7 0 0 1 2.4 2.4 1.7 1.7 0 0 0 1 2.5 1.7 1.7 0 0 1 0 3.4 1.7 1.7 0 0 0-1 2.6 1.7 1.7 0 0 1-2.4 2.4 1.7 1.7 0 0 0-2.6 1 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 0-2.5-1 1.7 1.7 0 0 1-2.4-2.4 1.7 1.7 0 0 0-1.1-2.6 1.7 1.7 0 0 1 0-3.4 1.7 1.7 0 0 0 1.1-2.5 1.7 1.7 0 0 1 2.4-2.4 1.7 1.7 0 0 0 2.5-1.1ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  chip: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 4h6v6H9V9Z',
};

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  permission?: string;
  mobile?: boolean;
}

const NAVIGATION: NavItem[] = [
  { href: '/', label: 'Overview', icon: 'home', mobile: true },
  { href: '/patients', label: 'Patients', icon: 'users', permission: 'patient.read', mobile: true },
  { href: '/screening', label: 'New Screening', icon: 'camera', permission: 'examination.create', mobile: true },
  { href: '/examinations', label: 'Examinations', icon: 'list', permission: 'examination.read' },
  { href: '/review-queue', label: 'Review Queue', icon: 'check', permission: 'review.sign', mobile: true },
  { href: '/follow-ups', label: 'Follow-ups', icon: 'calendar', permission: 'patient.read', mobile: true },
  { href: '/disease-library', label: 'Disease Library', icon: 'book' },
  { href: '/reports', label: 'Reports', icon: 'chart', permission: 'examination.read' },
  { href: '/administration', label: 'Administration', icon: 'cog', permission: 'administration.manage' },
  { href: '/model-information', label: 'Model Information', icon: 'chip' },
];

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name]} />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children, viewer }: { children: ReactNode; viewer: ViewerDTO | null }) {
  const pathname = usePathname();

  // The patient share page and sign-in render without the clinical shell.
  if (pathname.startsWith('/share/') || pathname === '/sign-in' || !viewer) {
    return <div className="min-h-screen bg-grid-pattern">{children}</div>;
  }

  const permissions = new Set(viewer.permissions);
  const items = NAVIGATION.filter((item) => !item.permission || permissions.has(item.permission));
  const mobileItems = items.filter((item) => item.mobile).slice(0, 5);

  return (
    <div className="min-h-screen bg-grid-pattern">
      <header className="sticky top-0 z-50 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-xl print:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="OpthaEdge overview">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20 sm:h-9 sm:w-9">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.2 12s3.6-6 9.8-6 9.8 6 9.8 6-3.6 6-9.8 6-9.8-6-9.8-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-white sm:text-lg">Optha<span className="text-cyan-400">Edge</span></span>
              <span className="hidden text-[11px] tracking-wide text-slate-500 sm:block">Diabetic eye screening at the edge</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300 md:inline-flex">
              Research use only
            </span>
            <span className="hidden max-w-56 truncate rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-200 sm:inline-flex">
              {viewer.displayName} · {viewer.roleNames.join(', ')}
            </span>
            <form action={signOutAction}>
              <button className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-slate-800/80 bg-slate-950/40 p-4 lg:flex lg:flex-col print:hidden">
          <nav className="space-y-1" aria-label="Primary navigation">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active ? 'bg-cyan-500/12 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${active ? 'border-cyan-400/30 bg-cyan-400/15' : 'border-slate-700 bg-slate-800/70'}`}>
                    <Icon name={item.icon} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-slate-300">Safety</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              AI grades are research output. A clinician confirms every result before it is final or shared with a patient.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden"
        aria-label="Primary navigation"
      >
        <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${mobileItems.length + 1}, minmax(0, 1fr))` }}>
          {mobileItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
                <Icon name={item.icon} className="h-5 w-5" />
                {item.label.replace('New ', '')}
              </Link>
            );
          })}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-slate-500">
              <Icon name="list" className="h-5 w-5" />
              More
            </summary>
            <div className="absolute bottom-full right-2 mb-2 w-56 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
              {items.filter((item) => !mobileItems.includes(item)).map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800">
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </nav>
    </div>
  );
}
