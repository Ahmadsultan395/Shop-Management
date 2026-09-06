# Backup & Restore Guide

Shop Manager is a fully offline app — all your data (suppliers, products,
purchases, employees, salaries) lives in a single file on this one
computer. **If this computer is lost, stolen, or has a hard drive
failure, and you have no backup, that data cannot be recovered.**

Please back up regularly. Once a week is a good habit; always back up
before anything risky (Windows reinstall, giving away the computer,
letting a technician work on it).

## Making a backup

1. Open Shop Manager and log in.
2. Go to **Backup** in the sidebar.
3. Click **Download Backup**.
4. Your browser/Windows will save a file named something like
   `shop-backup-2026-09-04.db`.
5. **Copy that file to a USB drive, or upload it somewhere safe** (a cloud
   drive, an email to yourself, etc). Don't leave your only backup on the
   same computer as the app — if that computer fails, the backup fails
   with it.

Keep a few backups from different dates if you can, not just the latest
one, in case a problem isn't noticed right away.

## Restoring a backup

Use this if you need to move to a new computer, or if something has gone
wrong with your data and you need to go back to an earlier saved copy.

1. Go to **Backup** in the sidebar.
2. Click **Restore from Backup** and choose your saved `.db` backup file.
3. The app checks that the file is a genuine, undamaged Shop Manager
   backup before doing anything. If it isn't, you'll see an error and
   nothing will change.
4. You'll see a warning that **your current data will be replaced**.
   Read it carefully before confirming — this cannot be undone from
   within the app once confirmed (though the app automatically saves a
   safety copy of your current data first, as an extra precaution — ask
   your software provider if you ever need to recover that safety copy).
5. Confirm. The app will restore your data and log you out — just log
   back in afterward, and you'll see the restored data.

## A note on moving to a new computer

1. On the old computer: Backup → Download Backup, and copy that file to a
   USB drive.
2. Install Shop Manager on the new computer (see the Installation Guide)
   and complete the first-time setup (you'll create a new username/
   password — this is separate from your data).
3. Go to Backup → Restore from Backup, and select the file from the USB
   drive.
