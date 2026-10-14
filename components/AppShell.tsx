'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOutAction } from '@/app/auth/actions';
import type { ViewerDTO } from '@/lib/auth/authorization';

const NAVIGATION = [
  { href: '/', label: 'Overview' },
  { href: '/patients', label: 'Patients' },
  { href: '/screening', label: 'New Screening' },
  { href: '/examinations', label: 'Examinations' },
  // Review Queue and Follow-ups are intentionally deferred and omitted here.
  { href: '/disease-library', label: 'Disease Library' },
  { href: '/reports', label: 'Reports' },
  { href: '/administration', label: 'Administration' },
  { href: '/model-information', label: 'Model Information' },
] as const;

function NavMark({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-bold ${
        active
          ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-300'
          : 'border-slate-700 bg-slate-800/70 text-slate-500'
      }`}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16" />
      </svg>
    </span>
  );
}

export default function AppShell({ children, viewer }: { children: ReactNode; viewer: ViewerDTO | null }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-grid-pattern">
      <header className="sticky top-0 z-50 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="OpthaEdge overview">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.2 12s3.6-6 9.8-6 9.8 6 9.8 6-3.6 6-9.8 6-9.8-6-9.8-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-white">Optha<span className="text-cyan-400">Edge</span></span>
              <span className="block text-[11px] tracking-wide text-slate-500">Intelligent eye-care platform</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300 sm:inline-flex">
              Research workspace
            </span>
            {viewer ? (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-200 sm:inline-flex">
                  {viewer.displayName} · {viewer.roleNames.join(', ')}
                </span>
                <form action={signOutAction}>
                  <button className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/sign-in" className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700">
                Sign in
              </Link>
            )}
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-slate-800/60 px-3 py-2 lg:hidden" aria-label="Primary navigation">
          {NAVIGATION.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  active ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/40 p-4 lg:flex lg:flex-col">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Clinical workspace</p>
          <nav className="space-y-1" aria-label="Primary navigation">
            {NAVIGATION.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-cyan-500/12 text-cyan-300 shadow-sm shadow-cyan-950/30'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <NavMark active={active} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-slate-300">Safety status</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Clinical deployment is blocked until model validation, production authentication, secure storage, and an image-quality workflow are approved.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
