"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmployeeForm } from "./EmployeeForm";
import { formatCurrency } from "@/lib/utils";
import type { Employee } from "@/types";

type StatusFilter = "active" | "inactive" | "all";

export function EmployeesClient({ currency }: { currency: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Employee | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleToggleActive() {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await fetch(`/api/employees/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: toggleTarget.is_active === 0 }),
      });
      setToggleTarget(null);
      load();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Your staff and their monthly salary."
        actions={<Button onClick={() => setShowForm(true)}>Add Employee</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <TextField
            label=""
            placeholder="Search by name, phone, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(["active", "inactive", "all"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium capitalize transition ${
                status === s
                  ? "border-ledger bg-ledger text-white"
                  : "border-paper-line bg-white text-ink-soft hover:bg-paper"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <EmptyState message="Loading employees..." />
        ) : employees.length === 0 ? (
          <EmptyState message="No employees found. Add your first employee to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Designation</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium text-right">Monthly Salary</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-paper-line last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3">
                    <Link href={`/employees/${e.id}`} className="font-medium text-ledger hover:underline">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{e.designation || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{e.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(e.monthly_salary, currency)}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={e.is_active === 1} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs">
                      <button onClick={() => setEditingEmployee(e)} className="text-ledger hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={() => setToggleTarget(e)}
                        className={e.is_active ? "text-stamp-red hover:underline" : "text-stamp-green hover:underline"}
                      >
                        {e.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <EmployeeForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editingEmployee && (
        <EmployeeForm
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSaved={() => {
            setEditingEmployee(null);
            load();
          }}
        />
      )}

      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.is_active ? "Deactivate employee?" : "Activate employee?"}
          message={
            toggleTarget.is_active
              ? `"${toggleTarget.name}" will be hidden from new salary records but their salary history is kept.`
              : `"${toggleTarget.name}" will be available again for new salary records.`
          }
          confirmLabel={toggleTarget.is_active ? "Deactivate" : "Activate"}
          variant={toggleTarget.is_active ? "danger" : "primary"}
          loading={toggling}
          onConfirm={handleToggleActive}
          onCancel={() => setToggleTarget(null)}
        />
      )}
    </div>
  );
}
