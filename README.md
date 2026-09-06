# Shop Manager — Developer README

Offline shop purchase & salary management app. Next.js (frontend + backend
API routes) + SQLite (better-sqlite3) + Tailwind CSS, packaged as a Windows
desktop app with Tauri.

## Status: feature-complete, packaging scaffold in place

All 20 functional sections of the original spec are implemented:

- **Auth**: first-run setup (single admin account), login, logout, change
  password/PIN. Scrypt password hashing, signed session cookie — no
  external auth service.
- **Dashboard**: live counts, this month/year purchase totals, this
  month's salary, pending salary, recent purchases, pending/partial
  salaries.
- **Suppliers / Products**: add, edit, search, deactivate/reactivate (no
  hard delete), detail pages with totals and a Week/Month/Year/Last
  Month/Last Year/Custom-filterable purchase history.
- **Purchases** (the main module): multi-item entry with auto-computed
  line totals and grand total, search + filters (supplier/product/date/
  status), invoice-style print view, void/restore instead of deletion.
- **Employees / Salaries**: full CRUD, salary amount auto-fills from the
  employee record, remaining amount and Pending/Partial/Paid status
  compute live, one record per employee per month enforced by a DB
  UNIQUE constraint, "Generate for Month" convenience action, employee
  detail page with a Year-filterable salary history.
- **Reports**: Purchase Report and Salary Report tabs, shared date-range
  filters plus supplier/product/employee/status filters, totals, and
  export to PDF/Excel/CSV or Print — every export/print respects
  whichever filters are currently applied.
- **Backup/Restore**: download a consistent snapshot (SQLite's native
  backup API) as `shop-backup-YYYY-MM-DD.db`; restore validates the file
  (header + integrity + expected-tables check), warns before replacing
  data, takes an automatic timestamped safety copy first, then swaps the
  live database and logs everyone out for a clean restart.
- **Settings**: Shop Name, Phone, Address, Currency, Change Password/PIN —
  kept deliberately small per the spec.
- **Tauri packaging scaffold**: `src-tauri/` contains a Tauri v1 shell that
  spawns the built Next.js server as a sidecar process and loads it into a
  plain desktop window — see `docs/PACKAGING.md` for the actual build
  steps (must be run on a Windows machine with Rust + Node installed;
  this sandbox has neither network access nor a Rust toolchain, so the
  Rust code has been written carefully but not compiled/tested here).

## Known limitation to flag to the client

Backup/Restore uses the browser's own file download/upload flow (a
"Download Backup" link and a file picker for Restore) rather than a
native Windows folder-picker dialog. This satisfies the spec's actual
requirements (choose a file to restore, confirm, validate, safety-backup
first) and works inside the Tauri webview, but if a native "Save As"
folder-choice dialog is specifically wanted, that's a small follow-up
using Tauri's `dialog` API — flagged here rather than silently expanded,
per the brief's "keep it minimal" instruction.

## Running it in development

You need Node.js 18+ (this sandbox has no internet access, so
dependencies haven't been installed or build-tested here — do that on
your own machine).

```bash
cd shop-manager
npm install
npm run dev
```

Open http://localhost:3000 — first run sends you to `/setup` to create
the admin account, then to the dashboard. The SQLite file is created at
`./data/shop-manager.db` in development.

## Building the Windows installer

See `docs/PACKAGING.md` for the full walkthrough (Node/Rust prerequisites,
obtaining a Node.js binary for the sidecar, generating icons, and the
exact build commands). Short version once prerequisites are met:

```bash
npm install
npm run build        # next build + stages the standalone server for Tauri
npm run tauri:build   # produces the Windows installer under src-tauri/target/release/bundle/nsis/
```

## Client-facing docs

- `docs/CLIENT_INSTALLATION_GUIDE.md` — installing the app on the shop's
  computer
- `docs/USER_GUIDE.md` — how to use every module day to day
- `docs/BACKUP_RESTORE_GUIDE.md` — why and how to back up regularly

## Project layout

```
src/app/              Next.js routes (pages + API routes)
src/app/(app)/        Protected pages behind the sidebar (dashboard, suppliers, ...)
src/app/api/          Backend logic — this IS the backend, no separate server
src/lib/db/           All SQLite access, centralized per table (schema.sql, users.ts, ...)
src/lib/auth/         Password hashing + session cookie logic
src/lib/validation/   Centralized input validation (purchases, salaries)
src/components/       Reusable UI (ui/), layout (layout/), and filter (filters/) pieces
src/types/            Shared TypeScript types
scripts/              Build-time helper (postbuild standalone staging for Tauri)
src-tauri/            Rust/Tauri desktop shell + packaging config
docs/                 Client- and developer-facing guides
```

## Design notes for the next developer

- `better-sqlite3` is a native module — kept external to the webpack
  bundle (`next.config.js`) and built in `output: "standalone"` mode so it
  packages cleanly into the Tauri sidecar.
- No data is ever hard-deleted for suppliers/products/employees/purchases
  — use `is_active` / `is_void` flags. Historical purchase/salary records
  must stay intact even if a supplier/product/employee is deactivated.
- Purchase price + quantity always live on `purchase_items`, never on
  `products` — the same product can be bought from different suppliers at
  different prices over time.
- `salary_records` has a UNIQUE(employee_id, salary_month) constraint so a
  duplicate monthly salary entry is impossible even before validation
  runs; paid amount is validated to never exceed the salary amount.
- The database path, session-signing secret, and all backups live under a
  per-user app-data folder resolved via `SHOP_MANAGER_DATA_DIR` (see
  `src/lib/db/index.ts`), never inside the app's own install folder.
- No external font/API/CDN calls anywhere — the app must keep working
  with the network fully disabled, which is the normal operating mode for
  the customer.

## Testing checklist before shipping

Since dependencies couldn't be installed in this sandbox, run through this
on your dev machine before delivering to a client (mirrors spec §19):

- [ ] Auth: login, wrong password, logout, change password/PIN
- [ ] Suppliers: add, edit, search, deactivate, view history + date filters
- [ ] Products: add, edit, search, deactivate, view history + date filters
- [ ] Purchases: single-item and multi-item purchases, different
      suppliers/prices, edit, search, all filters, correct totals, void/restore
- [ ] Employees: add, edit, search, deactivate
- [ ] Salaries: full/partial/pending payment, remaining calculation,
      duplicate-month prevention, paid-amount-exceeds-salary validation
- [ ] Reports: weekly/monthly/yearly/last-month/last-year/custom, supplier-
      wise, product-wise, employee-wise, correct totals
- [ ] Export: PDF, Excel, CSV, Print — each respects active filters
- [ ] Backup: create backup; Restore: valid file, invalid/corrupt file
      (should be rejected), confirm safety copy was created
- [ ] **Offline test**: disconnect the network entirely after installing,
      and go through every item above again — nothing should stop working
