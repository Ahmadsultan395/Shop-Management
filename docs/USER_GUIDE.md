# Shop Manager — User Guide

## Logging in

Open the app and enter your username and password/PIN. Use **Settings**
to change your password/PIN any time.

## Dashboard

The first screen you see. It shows, at a glance:
- How many suppliers, products, and employees you have
- This month's and this year's total purchases
- This month's total salary and how much salary is still pending
- Your most recent purchases and any pending/partial salary payments

Click any row to jump straight to that supplier, employee, or purchase.

## Suppliers

Everyone you buy stock from.

- **Add Supplier**: name, phone, address, notes.
- **Search**: type a name or phone number to filter the list.
- **Active / Inactive / All**: switch between currently-used suppliers and
  old ones you've stopped using.
- **Deactivate**: hides a supplier from new purchases without deleting
  their history. You can reactivate any time.
- Click a supplier's name to see their **total purchases, purchase count,
  and full purchase history** — filterable by week, month, year, or a
  custom date range.

## Products

The items you regularly buy for the shop. Works the same way as
Suppliers: add, search, deactivate/reactivate. A product's detail page
shows total quantity purchased, total amount spent, which suppliers you've
bought it from, and its full purchase history.

## Purchases — the main screen you'll use daily

1. Click **New Purchase**.
2. Choose the **Supplier** and the **Purchase Date**.
3. Optionally add a **Reference/Invoice Number** and **Notes**.
4. Add one row per item you bought: pick the **Product**, enter the
   **Quantity** and the **Purchase Price**. The line total and the grand
   total update automatically as you type.
5. Click **Save Purchase**.

To find an old purchase, use the **Purchases** list: search by supplier or
reference number, or filter by supplier, product, date range, or status.

Each purchase has a **View** page you can **Print** (looks like a proper
purchase record/invoice) and an **Edit** button. If you made a mistake and
want to cancel a purchase, use **Void** instead of trying to delete it —
this removes it from your totals and reports but keeps a permanent record
of it. You can **Restore** a voided purchase any time.

## Employees

Your staff. Add each employee's name, phone, designation, joining date,
monthly salary, and (optionally) which day of the month their salary is
due. Deactivate an employee who has left — their salary history stays
intact.

An employee's detail page shows this month's status, total paid, total
remaining, and a full salary history you can filter by year.

## Salaries

This is where you record what's actually been paid each month.

- **Generate for Month** creates a "pending" record for every active
  employee for the selected month, in one click — handy at the start of
  each month.
- **Add Salary Record** lets you add one manually — pick the employee and
  month, and the salary amount fills in automatically from their monthly
  salary (you can adjust it if needed).
- Enter the **Paid Amount** as you pay them (in full or in parts). The
  **Remaining** amount and the **Pending / Partial / Paid** status update
  automatically — you never have to calculate this yourself.
- Filter the list by month, employee, or status to see who still needs to
  be paid.

## Reports

Two report types, each with the same style of filters (This Week/Month/
Year, Last Month/Year, or a Custom Range):

- **Purchase Report** — every purchase line, filterable by supplier and
  product, with totals at the bottom. Good for answering questions like
  "what did I buy from this supplier last year, and how much did I spend?"
- **Salary Report** — every salary record, filterable by employee and
  payment status, with totals at the bottom.

Every report can be exported as **PDF**, **Excel**, or **CSV**, or sent
straight to your printer — whichever filters you've selected are exactly
what gets exported or printed.

## Settings

- Update your **Shop Name**, **Phone**, **Address**, and **Currency** —
  these appear on printed purchase records and exported reports.
- **Change Password/PIN** any time.

## Backup

See `docs/BACKUP_RESTORE_GUIDE.md` — please read this and back up
regularly. Your data lives only on this computer.
