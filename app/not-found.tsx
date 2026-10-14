import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Unavailable workspace</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-100">This module is not active</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          The requested route is unavailable in the current OpthaEdge configuration.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-400">
          Return to overview
        </Link>
      </div>
    </div>
  );
}

