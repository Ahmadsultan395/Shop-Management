import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { YearFilter } from "@/components/filters/YearFilter";
import { getEmployeeById } from "@/lib/db/employees";
import {
  getEmployeeSalarySummary,
  getEmployeeSalaryHistory,
  getAvailableSalaryYears,
  salaryRecordExists,
} from "@/lib/db/salaries";
import { getSettings } from "@/lib/db/settings";
import { formatCurrency, currentMonth } from "@/lib/utils";

export default function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { year?: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const employee = getEmployeeById(id);
  if (!employee) notFound();

  const currency = getSettings().currency;
  const year = searchParams.year;
  const summary = getEmployeeSalarySummary(id, year);
  const history = getEmployeeSalaryHistory(id, year);
  const availableYears = getAvailableSalaryYears();
  const thisMonth = currentMonth();
  const hasCurrentMonthRecord = salaryRecordExists(id, thisMonth);
  const currentMonthRecord = history.find((h) => h.salary_month === thisMonth);

  return (
    <div>
      <Link href="/employees" className="text-sm text-ledger hover:underline">
        ← Back to Employees
      </Link>

      <PageHeader
        title={employee.name}
        description={[employee.designation, employee.phone].filter(Boolean).join(" · ") || undefined}
        actions={
          <div className="flex items-center gap-3">
            <ActiveBadge active={employee.is_active === 1} />
            <Link href={`/salaries?employeeId=${employee.id}`}>
              <span className="rounded bg-ledger px-4 py-2 text-sm font-medium text-white hover:bg-ledger-dark">
                Manage Salary
              </span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Monthly Salary" value={formatCurrency(employee.monthly_salary, currency)} />
        <StatCard
          label="This Month"
          value={
            hasCurrentMonthRecord && currentMonthRecord
              ? formatCurrency(currentMonthRecord.remaining_amount, currency) + " due"
              : "Not recorded"
          }
        />
        <StatCard label="Total Paid" value={formatCurrency(summary.totalPaid, currency)} />
        <StatCard label="Total Remaining" value={formatCurrency(summary.totalRemaining, currency)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        {employee.joining_date && (
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Joining Date</p>
            <p>{employee.joining_date}</p>
          </div>
        )}
        {employee.salary_start_date && (
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Salary Start Date</p>
            <p>{employee.salary_start_date}</p>
          </div>
        )}
        {employee.salary_due_day && (
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Salary Due Day</p>
            <p>{employee.salary_due_day} of each month</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Salary History</h2>
          <YearFilter years={availableYears} />
        </div>

        <div className="panel overflow-hidden">
          {history.length === 0 ? (
            <EmptyState message="No salary records yet for this employee." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium text-right">Salary</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Remaining</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-paper-line last:border-0">
                    <td className="px-4 py-3">{h.salary_month}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(h.salary_amount, currency)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(h.paid_amount, currency)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(h.remaining_amount, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{h.payment_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {employee.notes && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Notes</h2>
          <p className="panel p-4 text-sm text-ink-soft">{employee.notes}</p>
        </div>
      )}
    </div>
  );
}
