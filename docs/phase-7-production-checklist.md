# Q Interior Design System - Production Readiness Checklist

## Environment

- Set `APP_ENV=production`.
- Set `APP_DEBUG=false`.
- Configure MySQL credentials in `.env`.
- Configure `APP_URL` and frontend API URL.
- Run `php artisan key:generate` once per environment.

## Laravel

- Run `php artisan migrate --force`.
- Run `php artisan storage:link`.
- Run `php artisan config:cache`.
- Run `php artisan route:cache`.
- Run `php artisan view:cache`.
- Configure scheduler cron: `* * * * * php /path/to/artisan schedule:run`.
- Configure queue worker if queued mail or jobs are enabled.

## Frontend

- Set the production API base URL.
- Run `npm.cmd run build`.
- Deploy the generated `dist` folder.
- Test staff login, client portal login, reports, backups, and PDF downloads.

## Security

- Use HTTPS.
- Use strong admin passwords.
- Review role access for admin, manager, finance, HR, staff, designer, and client portal.
- Confirm client portal cannot access staff/admin routes.
- Confirm protected downloads require authentication.
- Keep `.env` out of public web root and source control.

## Backups

- Confirm backup storage path is writable.
- Run a manual backup from Settings.
- Confirm scheduled `q:run-daily-backup` runs through Laravel Scheduler.
- Replace local manifest backups with `mysqldump` or managed cloud backups when production storage is ready.

## Final Smoke Tests

- Dashboard loads executive KPIs.
- Reports Center opens and exports CSV/PDF/print.
- Notifications mark read and mark all read.
- Quotations PDF downloads.
- Inventory stock in/out updates stock.
- HR leave and payroll flows work.
- Audit Logs record login/logout and backup creation.
