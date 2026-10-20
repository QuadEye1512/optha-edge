import { changeRoleAction, createUserAction, resetPasswordAction, setActiveAction } from '@/app/administration/actions';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, inputClass, labelClass, Notice, Page, PageHeader, secondaryButton } from '@/components/ui';
import { listAuditEvents, listUsers } from '@/data/admin';
import { getSystemReadiness } from '@/data/system-readiness';
import { requireActor } from '@/lib/auth/authorization';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/policy';
import { formatDateTime } from '@/lib/format';

export default async function AdministrationPage() {
  const actor = await requireActor();
  if (!hasPermission(actor, PERMISSIONS.ADMINISTRATION_MANAGE)) {
    return <Page><Notice tone="rose">Administration requires the Administrator role.</Notice></Page>;
  }
  const [{ users, roles }, audit, readiness] = await Promise.all([listUsers(actor), listAuditEvents(actor, 80), getSystemReadiness()]);
  const edge = readiness.edge;

  return (
    <Page>
      <PageHeader eyebrow="Administration" title="Users, devices & audit" description="Manage staff accounts and roles, check the edge device, and review the audit trail." />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card title="Staff accounts" description={`${users.length} members`}>
          <ul className="-my-2 divide-y divide-slate-800">
            {users.map((user) => (
              <li key={user.membershipId} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{user.displayName} {user.isSelf ? <span className="text-xs font-normal text-slate-500">(you)</span> : null}</p>
                    <p className="text-xs text-slate-500">{user.email} · last sign-in {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'never'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="cyan">{user.roleName}</Badge>
                    <Badge tone={user.active && user.status === 'ACTIVE' ? 'emerald' : 'rose'}>{user.active && user.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Badge>
                    {!user.hasPassword ? <Badge tone="amber">No password</Badge> : null}
                  </div>
                </div>
                {!user.isSelf ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer list-none text-[11px] font-semibold text-cyan-300">Manage</summary>
                    <div className="mt-3 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 sm:grid-cols-2">
                      <ActionForm action={changeRoleAction.bind(null, user.membershipId)} className="grid gap-2">
                        <label className={labelClass}>Role
                          <select name="roleId" defaultValue={user.roleId} className={inputClass}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
                        </label>
                        <div><SubmitButton className={secondaryButton}>Change role</SubmitButton></div>
                      </ActionForm>
                      <ActionForm action={resetPasswordAction.bind(null, user.membershipId)} className="grid gap-2">
                        <label className={labelClass}>New password<input name="password" type="password" autoComplete="new-password" className={inputClass} /></label>
                        <div><SubmitButton className={secondaryButton}>Reset password</SubmitButton></div>
                      </ActionForm>
                      <form action={setActiveAction.bind(null, user.membershipId, !(user.active && user.status === 'ACTIVE'))}>
                        <SubmitButton className="text-xs font-semibold text-rose-300" pendingText="…">{user.active && user.status === 'ACTIVE' ? 'Suspend account' : 'Reactivate account'}</SubmitButton>
                      </form>
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card title="Add staff member">
            <ActionForm action={createUserAction} className="grid gap-3">
              <label className={labelClass}>Full name<input name="displayName" className={inputClass} /></label>
              <label className={labelClass}>Email<input name="email" type="email" className={inputClass} /></label>
              <label className={labelClass}>Role
                <select name="roleId" className={inputClass}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
              </label>
              <label className={labelClass}>Temporary password<input name="password" type="password" autoComplete="new-password" placeholder="10+ characters, letters and numbers" className={inputClass} /></label>
              <div><SubmitButton>Create account</SubmitButton></div>
            </ActionForm>
            <ul className="mt-4 space-y-1 text-[11px] text-slate-500">
              {roles.map((role) => <li key={role.id}><span className="text-slate-300">{role.name}:</span> {role.description}</li>)}
            </ul>
          </Card>

          <Card title="Edge device" description={process.env.INFERENCE_URL || 'http://127.0.0.1:8001'}>
            {edge.ok ? (
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Status</dt><dd><Badge tone="emerald">Online</Badge></dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Model</dt><dd className="font-mono text-slate-300">{edge.health.model_file}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">SHA-256</dt><dd className="font-mono text-slate-300">{edge.health.artifact_sha256.slice(0, 16)}…</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Preprocessing</dt><dd className="font-mono text-slate-300">{edge.health.preprocessing}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Threads</dt><dd className="text-slate-300">{edge.health.threads}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Camera</dt><dd className="text-slate-300">{edge.health.camera.available ? `Ready (flip: ${edge.health.camera.flip ?? 'none'})` : 'Not detected'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Key required</dt><dd className="text-slate-300">{edge.health.auth_required ? 'Yes' : 'No'}</dd></div>
              </dl>
            ) : (
              <Notice tone="rose">Unreachable: {edge.error}. Check <code>systemctl status opthaedge-inference</code> on the Pi.</Notice>
            )}
            <ul className="mt-4 space-y-1.5">
              {readiness.items.slice(3).map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-400">{item.label}</span><Badge tone={item.ok ? 'emerald' : 'amber'}>{item.state}</Badge></li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Audit trail" description="Latest 80 events. Patient names and clinical text are never written to the audit log." className="xl:col-span-2">
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-2 font-medium">When</th><th className="px-4 py-2 font-medium">Who</th><th className="px-4 py-2 font-medium">Action</th><th className="px-4 py-2 font-medium">Resource</th><th className="px-4 py-2 font-medium">Outcome</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {audit.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-400">{formatDateTime(event.occurredAt)}</td>
                    <td className="px-4 py-2 text-slate-300">{event.actor}</td>
                    <td className="px-4 py-2 font-mono text-cyan-300/90">{event.action}</td>
                    <td className="px-4 py-2 text-slate-500">{event.resourceType} · {event.resourceId.slice(-8)}</td>
                    <td className="px-4 py-2"><Badge tone={event.outcome === 'SUCCESS' ? 'emerald' : 'rose'}>{event.outcome}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Page>
  );
}
