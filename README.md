# Shop Manager — Developer README

Offline shop purchase & salary management app. Next.js (frontend + backend
API routes) + SQLite (better-sqlite3) + Tailwind CSS, packaged as a
Windows and macOS desktop app with **Electron**.

## Status: feature-complete, packaging switched to Electron

All 20 functional sections of the original spec are implemented:

- **Auth**: first-run setup (single admin account), login, logout, change
  password/PIN. Scrypt password hashing, signed session cookie.
- **Dashboard**: live counts, this month/year purchase totals, this
  month's salary, pending salary, recent purchases, pending/partial
  salaries.
- **Suppliers / Products**: add, edit, search, deactivate/reactivate,
  detail pages with filterable purchase history.
- **Purchases** (the main module): multi-item entry, search + filters,
  invoice-style print view, void/restore instead of deletion.
- **Employees / Salaries**: full CRUD, auto-filled/computed salary
  amounts, one record per employee per month, "Generate for Month".
- **Reports**: Purchase Report and Salary Report tabs, shared filters,
  export to PDF/Excel/CSV or Print.
- **Backup/Restore**: download a consistent snapshot, validate + safety-
  copy + restore.
- **Settings**: Shop Name, Phone, Address, Currency, Change Password/PIN.
- **Desktop packaging**: this project previously used Tauri, which turned
  out to be fragile for this particular setup (a bundled Node.js sidecar
  running a Next.js standalone server) — repeated issues with resource
  bundling flattening `node_modules`, icon generation, and working-
  directory assumptions. It has been **replaced with Electron**
  (`electron/main.js` + `electron-builder`), which ships its own Node.js
  runtime internally, removing that whole category of problems. See
  `docs/PACKAGING.md`.

## Running it in development

```bash
cd shop-manager
npm install
npm run dev
```

Open http://localhost:3000 — first run sends you to `/setup` to create
the admin account, then to the dashboard. The SQLite file is created at
`./data/shop-manager.db` in development.

## Building the Windows / macOS installer

See `docs/PACKAGING.md` for the full walkthrough. Short version:

```bash
npm install
npm run electron:build
```

Produces an installer under `dist-electron/` for whichever OS you run
this on. To build **both** Windows and macOS installers without owning
both types of machine, push to GitHub and run the included
`.github/workflows/build.yml` workflow (Actions tab → Run workflow) —
it builds each platform on its native OS runner and gives you both
installers as downloadable artifacts.

## Client-facing docs

- `docs/CLIENT_INSTALLATION_GUIDE.md` — installing the app on the shop's
  computer
- `docs/USER_GUIDE.md` — how to use every module day to day
- `docs/BACKUP_RESTORE_GUIDE.md` — why and how to back up regularly

Note: these were written with a Windows-only installer in mind; the
overall flow (double-click, first-run setup, log in) is identical on
macOS, just via a `.dmg` instead of a `.exe`.

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
scripts/              Build-time helper (postbuild standalone staging)
electron/             Electron main process + app icons
.github/workflows/     GitHub Actions — builds Windows + macOS installers
docs/                 Client- and developer-facing guides
```

## Design notes for the next developer

- `better-sqlite3` is a native module — kept external to the webpack
  bundle (`next.config.js`) and built in `output: "standalone"` mode.
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
  `src/lib/db/index.ts`), which `electron/main.js` sets to Electron's
  `app.getPath("userData")` — never inside the app's own install folder.
- No external font/API/CDN calls anywhere — the app must keep working
  with the network fully disabled, which is the normal operating mode for
  the customer.

## Testing checklist before shipping

- [ ] Auth: login, wrong password, logout, change password/PIN
- [ ] Suppliers/Products: add, edit, search, deactivate, view history + date filters
- [ ] Purchases: single/multi-item, edit, search, filters, correct totals, void/restore
- [ ] Employees/Salaries: full/partial/pending payment, remaining calculation,
      duplicate-month prevention, paid-amount-exceeds-salary validation
- [ ] Reports: all date presets, supplier/product/employee-wise, correct totals
- [ ] Export: PDF, Excel, CSV, Print — each respects active filters
- [ ] Backup: create backup; Restore: valid file, invalid/corrupt file
      (should be rejected), confirm safety copy was created
- [ ] **Offline test**: disconnect the network entirely after installing,
      and go through every item above again — nothing should stop working
- [ ] Install the built `.exe`/`.dmg` on a clean machine that never had
      Node.js, and confirm it opens without any developer tools
