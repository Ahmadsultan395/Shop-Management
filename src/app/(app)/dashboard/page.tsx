import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getDashboardStats, getRecentPurchases, getPendingOrPartialSalaries } from "@/lib/db/dashboard";
import { getSettings } from "@/lib/db/settings";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const settings = getSettings();
  const currency = settings.currency;
  const stats = getDashboardStats();
  const recentPurchases = getRecentPurchases();
  const pendingSalaries = getPendingOrPartialSalaries();

  return (
    <div>
      <PageHeader title="Dashboard" description="A quick look at your shop today." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Suppliers" value={String(stats.totalSuppliers)} />
        <StatCard label="Total Products" value={String(stats.totalProducts)} />
        <StatCard label="Total Employees" value={String(stats.totalEmployees)} />
        <StatCard label="Pending Salary" value={formatCurrency(stats.pendingSalary, currency)} />
        <StatCard label="This Month Purchase" value={formatCurrency(stats.thisMonthPurchase, currency)} />
        <StatCard label="This Year Purchase" value={formatCurrency(stats.thisYearPurchase, currency)} />
        <StatCard label="This Month Salary" value={formatCurrency(stats.thisMonthSalary, currency)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="panel">
          <div className="flex items-center justify-between border-b border-paper-line px-4 py-3">
            <h2 className="text-sm font-medium">Recent Purchases</h2>
            <Link href="/purchases" className="text-xs text-ledger hover:underline">
              View all
            </Link>
          </div>
          {recentPurchases.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">
              No purchases yet. Add your first purchase to see it here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recentPurchases.map((p) => (
                  <tr key={p.id} className="border-b border-paper-line last:border-0">
                    <td className="px-4 py-2 text-ink-soft">{p.purchase_date}</td>
                    <td className="px-4 py-2">{p.supplier_name}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatCurrency(p.grand_total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="flex items-center justify-between border-b border-paper-line px-4 py-3">
            <h2 className="text-sm font-medium">Pending / Partial Salaries</h2>
            <Link href="/salaries" className="text-xs text-ledger hover:underline">
              View all
            </Link>
          </div>
          {pendingSalaries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">Nothing pending — all salaries are settled.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {pendingSalaries.map((s) => (
                  <tr key={s.id} className="border-b border-paper-line last:border-0">
                    <td className="px-4 py-2">{s.employee_name}</td>
                    <td className="px-4 py-2 text-ink-soft">{s.salary_month}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatCurrency(s.remaining_amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
