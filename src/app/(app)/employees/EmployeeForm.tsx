"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { TextareaField } from "@/components/ui/TextareaField";
import { Button } from "@/components/ui/Button";
import type { Employee } from "@/types";

export function EmployeeForm({
  employee,
  onClose,
  onSaved,
}: {
  employee?: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(employee);
  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [designation, setDesignation] = useState(employee?.designation ?? "");
  const [joiningDate, setJoiningDate] = useState(employee?.joining_date ?? "");
  const [salaryStartDate, setSalaryStartDate] = useState(employee?.salary_start_date ?? "");
  const [monthlySalary, setMonthlySalary] = useState(
    employee ? String(employee.monthly_salary) : ""
  );
  const [salaryDueDay, setSalaryDueDay] = useState(
    employee?.salary_due_day ? String(employee.salary_due_day) : ""
  );
  const [notes, setNotes] = useState(employee?.notes ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setLoading(true);
    try {
      const url = isEdit ? `/api/employees/${employee!.id}` : "/api/employees";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          designation,
          joining_date: joiningDate || null,
          salary_start_date: salaryStartDate || null,
          monthly_salary: monthlySalary ? Number(monthlySalary) : undefined,
          salary_due_day: salaryDueDay || null,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save employee.");
        setFields(data.fields ?? {});
        return;
      }
      onSaved();
    } catch {
      setError("Could not reach the local server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Employee" : "Add Employee"} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Employee Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fields.name}
          autoFocus
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField
            label="Designation (optional)"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Joining Date"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
          />
          <TextField
            label="Salary Start Date"
            type="date"
            value={salaryStartDate}
            onChange={(e) => setSalaryStartDate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Monthly Salary"
            type="number"
            min="0"
            step="any"
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(e.target.value)}
            error={fields.monthly_salary}
            required
          />
          <TextField
            label="Salary Due Day (optional)"
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 5"
            value={salaryDueDay}
            onChange={(e) => setSalaryDueDay(e.target.value)}
            error={fields.salary_due_day}
          />
        </div>
        <TextareaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add employee"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
