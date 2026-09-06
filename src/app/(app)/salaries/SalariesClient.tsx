"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SalaryForm } from "./SalaryForm";
import { formatCurrency, currentMonth } from "@/lib/utils";
import type { Employee, SalaryRecord, SalaryStatus } from "@/types";
import type { SalaryListRow } from "@/lib/db/salaries";

type StatusFilter = SalaryStatus | "all";

function SalariesInner({ currency }: { currency: string }) {
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<SalaryListRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [month, setMonth] = useState(currentMonth());
  const [employeeId, setEmployeeId] = useState(searchParams.get("employeeId") ?? "");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showAllMonths, setShowAllMonths] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);

  useEffect(() => {
    async function loadEmployees() {
      const res = await fetch("/api/employees?status=all");
      const data = await res.json();
      setEmployees(data.employees ?? []);
    }
    loadEmployees();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      if (!showAllMonths && month) params.set("month", month);
      if (employeeId) params.set("employeeId", employeeId);
      const res = await fetch(`/api/salaries?${params.toString()}`);
      const data = await res.json();
      setRecords(data.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [month, employeeId, status, showAllMonths]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", month: showAllMonths ? currentMonth() : month }),
      });
      load();
    } finally {
      setGenerating(false);
    }
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.salary += r.salary_amount;
      acc.paid += r.paid_amount;
      acc.remaining += r.remaining_amount;
      return acc;
    },
    { salary: 0, paid: 0, remaining: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Salaries"
        description="Monthly salary tracking — paid, partial, and pending."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleGenerate} loading={generating}>
              Generate for Month
            </Button>
            <Button onClick={() => setShowForm(true)}>Add Salary Record</Button>
          </div>
        }
      />

      <div className="panel mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
        <div>
          <TextField
            label="Month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={showAllMonths}
          />
          <label className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={showAllMonths}
              onChange={(e) => setShowAllMonths(e.target.checked)}
            />
            All months
          </label>
        </div>
        <SelectField label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">All employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </SelectField>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <EmptyState message="Loading salary records..." />
        ) : records.length === 0 ? (
          <EmptyState message="No salary records found. Use 'Generate for Month' or 'Add Salary Record' to create one." />
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
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-paper-line last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3 font-medium">{r.employee_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.salary_month}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r.salary_amount, currency)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r.paid_amount, currency)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(r.remaining_amount, currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.payment_date || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingRecord(r)} className="text-xs text-ledger hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right text-sm font-medium">
                  Total ({records.length})
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(totals.salary, currency)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(totals.paid, currency)}</td>
                <td className="px-4 py-3 text-right font-serif text-base">
                  {formatCurrency(totals.remaining, currency)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showForm && (
        <SalaryForm
          currency={currency}
          defaultEmployeeId={employeeId ? Number(employeeId) : undefined}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editingRecord && (
        <SalaryForm
          currency={currency}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            setEditingRecord(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export function SalariesClient({ currency }: { currency: string }) {
  return (
    <Suspense fallback={<EmptyState message="Loading..." />}>
      <SalariesInner currency={currency} />
    </Suspense>
  );
}
