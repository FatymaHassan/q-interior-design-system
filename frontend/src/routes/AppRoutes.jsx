import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import Projects from "../pages/projects/Projects";
import ProjectAdd from "../pages/projects/ProjectAdd";
import ProjectEdit from "../pages/projects/ProjectEdit";
import ProjectDetails from "../pages/projects/ProjectDetails";
import ProjectPlans from "../pages/projects/ProjectPlans";
import ProjectPlanForm from "../pages/projects/ProjectPlanForm";
import ProjectClientPayments from "../pages/projects/ProjectClientPayments";
import ProjectExpensesWorkspace from "../pages/projects/ProjectExpensesWorkspace";
import ProjectBoard from "../pages/project-board/ProjectBoard";
import DailyTasks from "../pages/tasks/DailyTasks";
import TaskDetails from "../pages/tasks/TaskDetails";
import ClientMessagesInbox from "../pages/client-messages/ClientMessagesInbox";
import ClientPortal from "../pages/client-portal/ClientPortal";
import Clients from "../pages/clients/Clients";
import ClientAdd from "../pages/clients/ClientAdd";
import ClientEdit from "../pages/clients/ClientEdit";
import ClientDetails from "../pages/clients/ClientDetails";
import Notifications from "../pages/notifications/Notifications";
import Settings from "../pages/settings/Settings";
import Documents from "../pages/documents/Documents";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import UsersRoles from "../pages/users-roles/UsersRoles";
import ProfitLoss from "../pages/finance/ProfitLoss";
import Invoices from "../pages/finance/Invoices";
import Expenses from "../pages/finance/Expenses";
import ExpenseAdd from "../pages/finance/ExpenseAdd";
import ExpenseEdit from "../pages/finance/ExpenseEdit";
import ExpenseCategories from "../pages/finance/ExpenseCategories";
import Payments from "../pages/finance/Payments";
import PaymentAdd from "../pages/finance/PaymentAdd";
import PaymentEdit from "../pages/finance/PaymentEdit";
import Suppliers from "../pages/finance/Suppliers";
import SupplierAdd from "../pages/finance/SupplierAdd";
import SupplierEdit from "../pages/finance/SupplierEdit";
import Quotations from "../pages/quotations/Quotations";
import QuotationForm from "../pages/quotations/QuotationForm";
import QuotationDetails from "../pages/quotations/QuotationDetails";
import Overheads from "../pages/finance/Overheads";
import OverheadAdd from "../pages/finance/OverheadAdd";
import OverheadEdit from "../pages/finance/OverheadEdit";
import HRDashboard from "../pages/hr/HRDashboard";
import EmployeeDirectory from "../pages/hr/EmployeeDirectory";
import EmployeeDetails from "../pages/hr/EmployeeDetails";
import EmployeeForm from "../pages/hr/EmployeeForm";
import Departments from "../pages/hr/Departments";
import Attendance from "../pages/hr/Attendance";
import AttendanceSettings from "../pages/hr/AttendanceSettings";
import Leave from "../pages/hr/Leave";
import Holidays from "../pages/hr/Holidays";
import Payroll from "../pages/hr/Payroll";
import ReviewsGoals from "../pages/hr/ReviewsGoals";
import InventoryModule from "../pages/inventory/InventoryModule";
import ReportsCenter from "../pages/reports/ReportsCenter";
import AuditLogs from "../pages/audit/AuditLogs";
import EmployeePortal from "../pages/employee-portal/EmployeePortal";
import { isAuthenticated, isEmployeePortalAuthenticated, userHasRole } from "../services/api";

function ProtectedLayout({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function RoleRoute({ roles, children }) {
  if (!userHasRole(roles)) {
    return <div className="rounded-2xl border border-brand-border bg-white p-8 text-center"><h1 className="text-2xl font-bold text-brand-primary">Unauthorized</h1><p className="mt-2 text-sm text-brand-muted">Your account does not have permission to open this page.</p></div>;
  }
  return children;
}

function EmployeePortalRoute({ children }) {
  const location = useLocation();
  if (!isEmployeePortalAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/employee-login" element={<Navigate to="/login" replace />} />
    <Route path="/employee-portal" element={<EmployeePortalRoute><EmployeePortal /></EmployeePortalRoute>} />
    <Route path="/client-login" element={<Navigate to="/login" replace />} />
    <Route path="/client-portal" element={<ClientPortal />} />
    <Route path="/*" element={<ProtectedLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/add" element={<ClientAdd />} />
        <Route path="/clients/:id" element={<ClientDetails />} />
        <Route path="/clients/:id/edit" element={<ClientEdit />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project-plans" element={<RoleRoute roles={["admin", "manager", "finance"]}><ProjectPlans /></RoleRoute>} />
        <Route path="/project-plans/add" element={<RoleRoute roles={["admin", "manager", "finance"]}><ProjectPlanForm /></RoleRoute>} />
        <Route path="/project-plans/:projectId/edit" element={<RoleRoute roles={["admin", "manager", "finance"]}><ProjectPlanForm /></RoleRoute>} />
        <Route path="/project-client-payments" element={<RoleRoute roles={["admin", "manager", "finance"]}><ProjectClientPayments /></RoleRoute>} />
        <Route path="/project-expenses" element={<RoleRoute roles={["admin", "manager", "finance"]}><ProjectExpensesWorkspace /></RoleRoute>} />
        <Route path="/project-board" element={<ProjectBoard />} />
        <Route path="/projects/add" element={<ProjectAdd />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/projects/:id/edit" element={<ProjectEdit />} />
        <Route path="/daily-tasks" element={<DailyTasks />} />
        <Route path="/tasks/:id" element={<TaskDetails />} />
        <Route path="/client-messages" element={<ClientMessagesInbox />} />
        <Route path="/photos" element={<Documents mode="photos" />} />
        <Route path="/documents" element={<Documents mode="documents" />} />
        <Route path="/finance" element={<RoleRoute roles={["admin", "manager", "finance"]}><ProfitLoss /></RoleRoute>} />
        <Route path="/finance/pnl" element={<RoleRoute roles={["admin", "manager", "finance"]}><ProfitLoss /></RoleRoute>} />
        <Route path="/invoices" element={<RoleRoute roles={["admin", "manager", "finance"]}><Invoices /></RoleRoute>} />
        <Route path="/expenses" element={<RoleRoute roles={["admin", "manager", "finance"]}><Expenses /></RoleRoute>} />
        <Route path="/expense-categories" element={<RoleRoute roles={["admin", "manager", "finance"]}><ExpenseCategories /></RoleRoute>} />
        <Route path="/expenses/add" element={<RoleRoute roles={["admin", "manager", "finance"]}><ExpenseAdd /></RoleRoute>} />
        <Route path="/expenses/:id/edit" element={<RoleRoute roles={["admin", "manager", "finance"]}><ExpenseEdit /></RoleRoute>} />
        <Route path="/payments" element={<RoleRoute roles={["admin", "manager", "finance"]}><Payments /></RoleRoute>} />
        <Route path="/payments/add" element={<RoleRoute roles={["admin", "manager", "finance"]}><PaymentAdd /></RoleRoute>} />
        <Route path="/payments/:id/edit" element={<RoleRoute roles={["admin", "manager", "finance"]}><PaymentEdit /></RoleRoute>} />
        <Route path="/suppliers" element={<RoleRoute roles={["admin", "manager", "finance"]}><Suppliers /></RoleRoute>} />
        <Route path="/suppliers/add" element={<RoleRoute roles={["admin", "manager", "finance"]}><SupplierAdd /></RoleRoute>} />
        <Route path="/suppliers/:id/edit" element={<RoleRoute roles={["admin", "manager", "finance"]}><SupplierEdit /></RoleRoute>} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/add" element={<QuotationForm />} />
        <Route path="/quotations/:id" element={<QuotationDetails />} />
        <Route path="/quotations/:id/edit" element={<QuotationForm />} />
        <Route path="/overheads" element={<RoleRoute roles={["admin", "manager", "finance"]}><Overheads /></RoleRoute>} />
        <Route path="/overheads/add" element={<RoleRoute roles={["admin", "manager", "finance"]}><OverheadAdd /></RoleRoute>} />
        <Route path="/overheads/:id/edit" element={<RoleRoute roles={["admin", "manager", "finance"]}><OverheadEdit /></RoleRoute>} />
        <Route path="/finance/payroll" element={<RoleRoute roles={["admin", "manager", "finance"]}><Payroll /></RoleRoute>} />
        <Route path="/hr" element={<RoleRoute roles={["admin", "manager", "hr"]}><HRDashboard /></RoleRoute>} />
        <Route path="/hr/employees" element={<RoleRoute roles={["admin", "manager", "hr"]}><EmployeeDirectory /></RoleRoute>} />
        <Route path="/hr/employees/add" element={<RoleRoute roles={["admin", "manager", "hr"]}><EmployeeForm /></RoleRoute>} />
        <Route path="/hr/employees/:id" element={<RoleRoute roles={["admin", "manager", "hr"]}><EmployeeDetails /></RoleRoute>} />
        <Route path="/hr/employees/:id/edit" element={<RoleRoute roles={["admin", "manager", "hr"]}><EmployeeForm /></RoleRoute>} />
        <Route path="/hr/departments" element={<RoleRoute roles={["admin", "manager", "hr"]}><Departments /></RoleRoute>} />
        <Route path="/hr/attendance" element={<RoleRoute roles={["admin", "manager", "hr"]}><Attendance /></RoleRoute>} />
        <Route path="/hr/attendance-settings" element={<RoleRoute roles={["admin", "manager", "hr"]}><AttendanceSettings /></RoleRoute>} />
        <Route path="/hr/leave" element={<RoleRoute roles={["admin", "manager", "hr"]}><Leave /></RoleRoute>} />
        <Route path="/hr/holidays" element={<RoleRoute roles={["admin", "manager", "hr"]}><Holidays /></RoleRoute>} />
        <Route path="/hr/payroll" element={<Navigate to="/finance/payroll" replace />} />
        <Route path="/hr/reviews" element={<RoleRoute roles={["admin", "manager", "hr"]}><ReviewsGoals /></RoleRoute>} />
        <Route path="/inventory" element={<RoleRoute roles={["admin", "manager", "finance", "staff"]}><InventoryModule /></RoleRoute>} />
        <Route path="/reports" element={<RoleRoute roles={["admin", "manager", "finance"]}><ReportsCenter /></RoleRoute>} />
        <Route path="/audit-logs" element={<RoleRoute roles="admin"><AuditLogs /></RoleRoute>} />
        <Route path="/users-roles" element={<RoleRoute roles={["admin", "manager"]}><UsersRoles /></RoleRoute>} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<RoleRoute roles="admin"><Settings /></RoleRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ProtectedLayout>} />
  </Routes>;
}
