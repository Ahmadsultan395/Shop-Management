"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { TextareaField } from "@/components/ui/TextareaField";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, currentMonth } from "@/lib/utils";
import type { Employee, SalaryRecord } from "@/types";

export function SalaryForm({
  record,
  defaultEmployeeId,
  currency,
  onClose,
  onSaved,
}: {
  record?: SalaryRecord | null;
  defaultEmployeeId?: number;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(record);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [employeeId, setEmployeeId] = useState(
    record ? String(record.employee_id) : defaultEmployeeId ? String(defaultEmployeeId) : ""
  );
  const [salaryMonth, setSalaryMonth] = useState(record?.salary_month ?? currentMonth());
  const [salaryAmount, setSalaryAmount] = useState(record ? String(record.salary_amount) : "");
  const [paidAmount, setPaidAmount] = useState(record ? String(record.paid_amount) : "0");
  const [paymentDate, setPaymentDate] = useState(record?.payment_date ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");

  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingEmployees(true);
      try {
        const res = await fetch("/api/employees?status=all");
        const data = await res.json();
        setEmployees(data.employees ?? []);
      } finally {
        setLoadingEmployees(false);
      }
    }
    load();
  }, []);

  function handleEmployeeChange(id: string) {
    setEmployeeId(id);
    if (!isEdit) {
      const emp = employees.find((e) => String(e.id) === id);
      if (emp) setSalaryAmount(String(emp.monthly_salary));
    }
  }

  const remaining = useMemo(() => {
    const salary = parseFloat(salaryAmount);
    const paid = parseFloat(paidAmount);
    if (!Number.isFinite(salary) || !Number.isFinite(paid)) return 0;
    return Math.max(salary - paid, 0);
  }, [salaryAmount, paidAmount]);

  const status = useMemo(() => {
    const salary = parseFloat(salaryAmount);
    const paid = parseFloat(paidAmount);
    if (!Number.isFinite(salary) || !Number.isFinite(paid) || paid <= 0) return "pending" as const;
    if (paid >= salary) return "paid" as const;
    return "partial" as const;
  }, [salaryAmount, paidAmount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setSaving(true);
    try {
      const url = isEdit ? `/api/salaries/${record!.id}` : "/api/salaries";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId ? Number(employeeId) : undefined,
          salary_month: salaryMonth,
          salary_amount: salaryAmount ? Number(salaryAmount) : undefined,
          paid_amount: paidAmount ? Number(paidAmount) : 0,
          payment_date: paymentDate || null,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save salary record.");
        setFields(data.fields ?? {});
        return;
      }
      onSaved();
    } catch {
      setError("Could not reach the local server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Salary Record" : "Add Salary Record"} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Employee"
          value={employeeId}
          onChange={(e) => handleEmployeeChange(e.target.value)}
          error={fields.employee_id}
          disabled={loadingEmployees || isEdit}
          required
        >
          <option value="">Select employee...</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
              {emp.is_active === 0 ? " (Inactive)" : ""}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Salary Month"
          type="month"
          value={salaryMonth}
          onChange={(e) => setSalaryMonth(e.target.value)}
          error={fields.salary_month}
          disabled={isEdit}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Salary Amount"
            type="number"
            min="0"
            step="any"
            value={salaryAmount}
            onChange={(e) => setSalaryAmount(e.target.value)}
            error={fields.salary_amount}
            required
          />
          <TextField
            label="Paid Amount"
            type="number"
            min="0"
            step="any"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            error={fields.paid_amount}
            required
          />
        </div>

        <TextField
          label="Payment Date (optional)"
          type="date"
          value={paymentDate ?? ""}
          onChange={(e) => setPaymentDate(e.target.value)}
          error={fields.payment_date}
        />

        <div className="flex items-center justify-between rounded border border-paper-line bg-paper px-3 py-2 text-sm">
          <span className="text-ink-soft">
            Remaining: <span className="font-medium text-ink">{formatCurrency(remaining, currency)}</span>
          </span>
          <StatusBadge status={status} />
        </div>

        <TextareaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? "Save changes" : "Add record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
