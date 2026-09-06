export type SalaryStatus = "pending" | "partial" | "paid";

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  category: string | null;
  unit: string | null;
  notes: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  purchase_date: string;
  reference_no: string | null;
  notes: string | null;
  grand_total: number;
  is_void: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  item_total: number;
  created_at: string;
}

export interface Employee {
  id: number;
  name: string;
  phone: string | null;
  designation: string | null;
  joining_date: string | null;
  salary_start_date: string | null;
  monthly_salary: number;
  salary_due_day: number | null;
  is_active: 0 | 1;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryRecord {
  id: number;
  employee_id: number;
  salary_month: string; // YYYY-MM
  salary_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_date: string | null;
  status: SalaryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: 1;
  shop_name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  updated_at: string;
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}
