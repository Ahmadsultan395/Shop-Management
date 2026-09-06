"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { DATE_RANGE_OPTIONS, type DateRangePreset } from "@/lib/dateRange";
import { exportReportToPdf, exportReportToXlsx, exportReportToCsv } from "@/lib/reportExport";
import type { Employee, SalaryStatus } from "@/types";
import type { SalaryReportRow, SalaryReportTotals } from "@/lib/db/reports";

const STATUS_LABEL: Record<SalaryStatus, string> = { pending: "Pending", partial: "Partial", paid: "Paid" };

export function SalaryReportTab({ shopName, currency }: { shopName: string; currency: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<SalaryReportRow[]>([]);
  const [totals, setTotals] = useState<SalaryReportTotals>({ totalSalary: 0, totalPaid: 0, totalRemaining: 0 });
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<DateRangePreset>("year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<SalaryStatus | "all">("all");
  const [resolvedRange, setResolvedRange] = useState<{ monthFrom: string | null; monthTo: string | null }>({
    monthFrom: null,
    monthTo: null,
  });

  useEffect(() => {
    async function loadOptions() {
      const res = await fetch("/api/employees?status=all");
      setEmployees((await res.json()).employees ?? []);
    }
    loadOptions();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range, status });
      if (range === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      if (employeeId) params.set("employeeId", employeeId);

      const res = await fetch(`/api/reports/salaries?${params.toString()}`);
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotals(data.totals ?? { totalSalary: 0, totalPaid: 0, totalRemaining: 0 });
      setResolvedRange({ monthFrom: data.monthFrom, monthTo: data.monthTo });
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo, employeeId, status]);

  useEffect(() => {
    load();
  }, [load]);

  const dateRangeLabel =
    resolvedRange.monthFrom && resolvedRange.monthTo
      ? `${resolvedRange.monthFrom} to ${resolvedRange.monthTo}`
      : "All time";

  const filterParts: string[] = [];
  const employeeName = employees.find((e) => String(e.id) === employeeId)?.name;
  if (employeeName) filterParts.push(`Employee: ${employeeName}`);
  if (status !== "all") filterParts.push(`Status: ${STATUS_LABEL[status]}`);
  const filtersSummary = filterParts.join(" · ");

  const columns = ["Employee", "Salary Month", "Salary", "Paid", "Remaining", "Status", "Payment Date"];
  const exportRows = rows.map((r) => [
    r.employee_name,
    r.salary_month,
    r.salary_amount,
    r.paid_amount,
    r.remaining_amount,
    STATUS_LABEL[r.status],
    r.payment_date ?? "",
  ]);
  const totalsRow = ["Totals", "", totals.totalSalary, totals.totalPaid, totals.totalRemaining, "", ""];

  const meta = { shopName, reportTitle: "Salary Report", filtersSummary, dateRangeLabel };

  return (
    <div>
      <div className="panel no-print mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                range === opt.value
                  ? "border-ledger bg-ledger text-white"
                  : "border-paper-line bg-white text-ink-soft hover:bg-paper"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="field-input w-auto py-1.5 text-xs"
              />
              <span className="text-xs text-ink-soft">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="field-input w-auto py-1.5 text-xs"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SelectField label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Payment Status" value={status} onChange={(e) => setStatus(e.target.value as SalaryStatus | "all")}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </SelectField>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportReportToPdf(meta, columns, exportRows, totalsRow, "salary-report.pdf")}
          >
            Export PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportReportToXlsx(meta, columns, exportRows, totalsRow, "salary-report.xlsx")}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportReportToCsv(meta, columns, exportRows, totalsRow, "salary-report.csv")}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="print-header mb-4 hidden print:block">
        <h1 className="font-serif text-xl">{shopName}</h1>
        <p className="text-sm">Salary Report</p>
        <p className="text-xs text-ink-soft">{dateRangeLabel}</p>
        {filtersSummary && <p className="text-xs text-ink-soft">{filtersSummary}</p>}
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <EmptyState message="Loading report..." />
        ) : rows.length === 0 ? (
          <EmptyState message="No salary records match these filters." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium text-right">Salary</th>
                <th className="px-4 py-3 font-medium text-right">Paid</th>
                <th className="px-4 py-3 font-medium text-right">Remaining</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-paper-line last:border-0">
                  <td className="px-4 py-2 font-medium">{r.employee_name}</td>
                  <td className="px-4 py-2 text-ink-soft">{r.salary_month}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.salary_amount, currency)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.paid_amount, currency)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(r.remaining_amount, currency)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2 text-ink-soft">{r.payment_date || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right text-sm font-medium">
                  Totals
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(totals.totalSalary, currency)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(totals.totalPaid, currency)}</td>
                <td className="px-4 py-3 text-right font-serif text-base">
                  {formatCurrency(totals.totalRemaining, currency)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
