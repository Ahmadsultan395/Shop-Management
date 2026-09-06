-- Shop Manager — SQLite schema
-- Design rules followed here:
--  * Never hard-delete rows that historical records point to (suppliers,
--    products, employees, purchases). Use is_active / is_void flags instead.
--  * Purchase price/quantity live on purchase_items, never on products —
--    the same product can be bought from different suppliers at different
--    prices over time.
--  * salary_records has one row per (employee, month) — enforced with a
--    UNIQUE constraint so duplicate monthly salary entries are impossible
--    at the database level, not just in the UI.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  shop_name   TEXT NOT NULL DEFAULT 'My Shop',
  phone       TEXT,
  address     TEXT,
  currency    TEXT NOT NULL DEFAULT 'PKR',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT,
  unit        TEXT,
  notes       TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

CREATE TABLE IF NOT EXISTS purchases (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id   INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_date TEXT NOT NULL,               -- ISO date, YYYY-MM-DD
  reference_no  TEXT,
  notes         TEXT,
  grand_total   REAL NOT NULL DEFAULT 0,     -- denormalized sum of items, kept in sync by app layer
  is_void       INTEGER NOT NULL DEFAULT 0 CHECK (is_void IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_void ON purchases(is_void);

CREATE TABLE IF NOT EXISTS purchase_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id  INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     REAL NOT NULL CHECK (quantity > 0),
  unit_price   REAL NOT NULL CHECK (unit_price >= 0),
  item_total   REAL NOT NULL,                -- quantity * unit_price, stored for fast report queries
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

CREATE TABLE IF NOT EXISTS employees (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  phone             TEXT,
  designation       TEXT,
  joining_date      TEXT,
  salary_start_date TEXT,
  monthly_salary    REAL NOT NULL CHECK (monthly_salary >= 0),
  salary_due_day    INTEGER CHECK (salary_due_day BETWEEN 1 AND 31),
  is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);

CREATE TABLE IF NOT EXISTS salary_records (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  salary_month     TEXT NOT NULL,             -- 'YYYY-MM'
  salary_amount    REAL NOT NULL CHECK (salary_amount >= 0),
  paid_amount      REAL NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount REAL NOT NULL DEFAULT 0,
  payment_date     TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (employee_id, salary_month)
);
CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_month ON salary_records(salary_month);
CREATE INDEX IF NOT EXISTS idx_salary_status ON salary_records(status);
