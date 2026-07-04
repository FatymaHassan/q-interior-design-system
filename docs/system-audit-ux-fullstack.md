# Q Interior Full-Stack UX/System Audit

Date: 2026-07-04

## 1. What Already Exists

- Frontend is React + Vite + Tailwind CSS under `frontend/`.
- Backend is Laravel 12 + Sanctum API under `q-interior-backend/`.
- Database configuration is MySQL-driven through Laravel `.env`.
- Authentication exists for admin/staff, employee portal, and client portal.
- Protected frontend routes and role checks exist in `frontend/src/routes/AppRoutes.jsx`.
- Reusable UI components exist for cards, buttons, headers, forms, tables, badges, loading, and empty states.
- Main modules already exist: dashboard, projects, finance, clients, suppliers, inventory, quotations, HR/payroll, reports, settings, notifications, audit logs, documents/photos, client portal, and employee portal.
- API routes are broad and connected: 292 API routes are registered.
- Dashboard data comes from API endpoints, especially `GET /api/dashboard/summary` and `GET /api/dashboard/executive`.
- Reports and exports exist through `GET /api/reports/{key}/export`.
- Quotation PDF and preview routes exist.
- Inventory, purchase orders, supplier balances, low stock reports, project material usage, and HR reports exist.

## 2. What Is Missing

- A formal implementation checklist for gradually unifying all module screens to one design system.
- True global search behavior in the admin header was not functional before this pass.
- Some module screens still need individual UX cleanup after the shared design refresh.
- The frontend bundle is large and should later be split by route for faster production loading.
- Browser-level visual QA across desktop, tablet, and mobile still needs to be repeated after each major module pass.
- A complete end-to-end database smoke test could not run locally because MySQL was not accepting connections.

## 3. What Is Broken

- Local MySQL is not reachable at `127.0.0.1:3306`, so `php artisan migrate:status` fails in this environment.
- The frontend build passes, but Vite reports a large bundle warning.
- Vite also warns that `frontend/package.json` does not declare `"type": "module"` while `postcss.config.js` is parsed as ESM.

## 4. What Needs Redesign

- Shared visual primitives needed tightening: card radius, shadows, button shape, table density, loading states, empty states, page headers, and KPI cards.
- Admin shell needed a more refined top bar, real navigation search, and more consistent responsive spacing.
- Dashboard needed stronger information hierarchy: primary business KPIs first, business health second, quick actions and alerts nearby, and charts/tables below.
- Individual module screens should next be reviewed one by one for consistent titles, subtitles, main actions, filters, status badges, validation language, and empty/error states.

## 5. Database Tables That Need Updates

No urgent schema change is required for the requested redesign because the core tables already exist:

- `users`, `roles`, `permissions`, `settings`
- `clients`, `projects`, `documents`, `tasks`
- `payments`, `expenses`, `overheads`, `invoices`, `expense_categories`
- `suppliers`, `materials`, `material_categories`, `inventory_movements`, `purchase_orders`
- `quotations`, `quotation_items`, `quotation_sections`, `quotation_rooms`, `quotation_attachments`, `quotation_versions`, `quotation_approvals`
- `employees`, `departments`, `attendances`, `leave_requests`, `payrolls`, `performance_reviews`, `employee_goals`
- `reports` are API-computed rather than one single table.

Later database improvements can be considered for saved user UI preferences, saved table filters, dashboard widget preferences, and audit-friendly export history.

## 6. API Endpoints That Need Updates

No blocking API route is missing for the broad module list. The current API already includes dashboard, projects, finance, clients, suppliers, inventory, quotations, HR/payroll, reports, settings, users/roles, documents, notifications, and portals.

Useful future API refinements:

- Add a unified `/api/search` endpoint for true database-backed global search.
- Add dashboard alert endpoints with categorized severity and direct action links.
- Add saved table filters and report presets.
- Add export history metadata for PDF/Excel downloads.

## 7. Frontend Pages/Components That Need Redesign

Completed in this pass:

- `frontend/src/styles/index.css`
- `frontend/src/components/ui/Card.jsx`
- `frontend/src/components/ui/Button.jsx`
- `frontend/src/components/ui/PageHeader.jsx`
- `frontend/src/components/ui/MetricCard.jsx`
- `frontend/src/components/ui/Table.jsx`
- `frontend/src/components/ui/SectionCard.jsx`
- `frontend/src/components/ui/LoadingState.jsx`
- `frontend/src/components/ui/EmptyState.jsx`
- `frontend/src/components/layout/DashboardLayout.jsx`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/pages/dashboard/Dashboard.jsx`

Recommended next passes:

- Projects list/details/forms
- Finance P&L, payments, expenses, invoices, overheads
- Clients list/details/forms
- Suppliers and inventory
- Quotations form/details/PDF preview flow
- HR dashboard, employee directory, payroll, attendance setup
- Reports center and settings
