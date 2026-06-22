import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { account } from "@/lib/data/account";
import { usd } from "@/lib/format";

export const metadata = { title: "Account" };

export default function AccountPage() {
  const { org, users, shipTo } = account;
  const creditAvailable = org.creditLimitUsd - org.creditUsedUsd;
  const usedPct = Math.round((org.creditUsedUsd / org.creditLimitUsd) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description={`${org.name} · ${org.accountNumber}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Payment terms" value={org.terms} />
        <StatCard label="Credit limit" value={usd(org.creditLimitUsd)} />
        <StatCard
          label="Credit available"
          value={usd(creditAvailable)}
          sub={`${usedPct}% used`}
          tone={usedPct > 80 ? "amber" : "green"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Users</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.email}>
                  <td className="px-5 py-3">
                    <span className="block font-medium text-ink">{u.name}</span>
                    <span className="block text-xs text-slate-500">{u.email}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge tone={u.role === "Admin" ? "brand" : u.role === "Viewer" ? "slate" : "sky"}>
                      {u.role}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Ship-to addresses</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {shipTo.map((s) => (
              <li key={s.label} className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{s.label}</span>
                  {s.default ? <Badge tone="green">Default</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{s.address}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
