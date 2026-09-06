import { getEmployeeById } from "@/lib/db/employees";
import { salaryRecordExists, type SalaryRecordInput } from "@/lib/db/salaries";
import { isValidYearMonth, isNonNegativeNumber, isValidIsoDate } from "@/lib/utils";

export interface RawSalaryInput {
  employee_id?: number;
  salary_month?: string;
  salary_amount?: number;
  paid_amount?: number;
  payment_date?: string;
  notes?: string;
}

export interface ValidationResult {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
  value?: SalaryRecordInput;
}

export function validateSalaryInput(raw: RawSalaryInput, excludeId?: number): ValidationResult {
  const fields: Record<string, string> = {};

  if (!raw.employee_id || !Number.isInteger(raw.employee_id)) {
    fields.employee_id = "Select an employee.";
  } else if (!getEmployeeById(raw.employee_id)) {
    fields.employee_id = "Selected employee does not exist.";
  }

  if (!isValidYearMonth(raw.salary_month)) {
    fields.salary_month = "Select a valid salary month.";
  } else if (
    raw.employee_id &&
    getEmployeeById(raw.employee_id) &&
    salaryRecordExists(raw.employee_id, raw.salary_month!, excludeId)
  ) {
    fields.salary_month = "A salary record for this employee and month already exists.";
  }

  if (!isNonNegativeNumber(raw.salary_amount)) {
    fields.salary_amount = "Enter a valid salary amount.";
  }

  if (!isNonNegativeNumber(raw.paid_amount)) {
    fields.paid_amount = "Enter a valid paid amount.";
  } else if (
    isNonNegativeNumber(raw.salary_amount) &&
    raw.paid_amount! > raw.salary_amount!
  ) {
    fields.paid_amount = "Paid amount cannot exceed the salary amount.";
  }

  if (raw.payment_date && !isValidIsoDate(raw.payment_date)) {
    fields.payment_date = "Enter a valid payment date.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Please fix the highlighted fields.", fields };
  }

  return {
    ok: true,
    value: {
      employee_id: raw.employee_id!,
      salary_month: raw.salary_month!,
      salary_amount: raw.salary_amount!,
      paid_amount: raw.paid_amount!,
      payment_date: raw.payment_date || null,
      notes: raw.notes || null,
    },
  };
}
