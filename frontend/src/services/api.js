import axios from "axios";
import { formatDateOnly } from "../utils/dateTime";

const defaultApiUrl =
  typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "/api"
    : "https://q-interior-design-system.onrender.com/api";

const apiBaseUrl = import.meta.env.VITE_API_URL || defaultApiUrl;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("q_interior_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("q_interior_token");
      localStorage.removeItem("q_interior_user");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

const money = (value) => Number(value || 0);

export const CLIENT_PAYMENT_TYPES = ["client", "client_payment"];
export const SUPPLIER_PAYMENT_TYPES = ["supplier", "supplier_payment"];

export function isClientPayment(type) {
  return CLIENT_PAYMENT_TYPES.includes(type);
}

export function isSupplierPayment(type) {
  return SUPPLIER_PAYMENT_TYPES.includes(type);
}

export function paymentTypeLabel(type) {
  if (isClientPayment(type)) return "Client payment";
  if (isSupplierPayment(type)) return "Supplier payment";
  return type || "Payment";
}

export function mapProject(project) {
  return {
    id: project.id,
    name: project.name || project.project_name || "Untitled Project",
    client: project.client?.name || "No client assigned",
    location: project.location || "Not set",
    budget: money(project.budget),
    contractAmount: money(project.contract_amount || project.revenue || project.budget),
    paidAmount: money(project.paid_amount),
    remainingBalance: money(project.remaining_balance),
    paymentPercentage: Number(project.payment_percentage || 0),
    paymentPlanType: project.payment_plan_type || "Deposit + Final Payment",
    expenses: money(project.actual_cost),
    progress: Number(project.progress || 0),
    status: project.status || "Pending",
    stage: project.stage?.name || "Inquiry",
    stageId: project.project_stage_id || project.stage?.id || "",
    due: project.end_date || "Not set",
    deadline: project.deadline || project.end_date || "Not set",
    summary: project.summary ? mapProjectSummary(project.summary) : null,
    raw: project,
  };
}

export function mapUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || user.roles?.[0]?.name || "viewer",
    roles: user.roles || [],
  };
}

export function mapRole(role) {
  return {
    id: role.id,
    name: role.name,
    label: role.label || role.name,
    permissions: role.permissions || [],
  };
}

export function mapSetting(setting) {
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value || "",
    type: setting.type || "string",
  };
}

export function mapProjectSummary(summary) {
  return {
    id: summary.id,
    name: summary.name,
    client: summary.client,
    clientPayment: money(summary.client_payment),
    designCosts: money(summary.design_costs),
    materials: money(summary.materials),
    labourCosts: money(summary.labour_costs),
    siteExpenses: money(summary.site_expenses),
    totalProjectCost: money(summary.total_project_cost),
    projectProfit: money(summary.project_profit),
    profitMargin: money(summary.profit_margin),
    progress: Number(summary.progress || 0),
  };
}

export function mapSupplier(supplier) {
  return {
    id: supplier.id,
    name: supplier.name,
    category: supplier.category || "General",
    contactPerson: supplier.contact_person || "",
    email: supplier.email || "",
    phone: supplier.phone || "-",
    address: supplier.address || "",
    city: supplier.city || supplier.location || "",
    orders: Number(supplier.total_orders || 0),
    paid: money(supplier.paid_amount),
    balance: money(supplier.current_balance ?? supplier.balance),
    status: supplier.status || "Active",
    rating: supplier.rating || "-",
    raw: supplier,
  };
}

export function mapMaterial(material) {
  return {
    id: material.id,
    code: material.code || "",
    name: material.name,
    category: material.category?.name || "-",
    categoryId: material.material_category_id || material.category?.id || "",
    supplier: material.supplier?.name || "-",
    supplierId: material.supplier_id || material.supplier?.id || "",
    unit: material.unit || "Unit",
    purchasePrice: money(material.purchase_price),
    sellingPrice: money(material.selling_price),
    currentStock: Number(material.current_stock || 0),
    minimumStock: Number(material.minimum_stock || 0),
    stockStatus: material.stock_status || "In Stock",
    stockValue: money(material.stock_value),
    storageLocation: material.storage_location || "",
    status: material.status || "Active",
    notes: material.notes || "",
    raw: material,
  };
}

export function mapPurchaseOrder(order) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    supplier: order.supplier?.name || "-",
    supplierId: order.supplier_id || order.supplier?.id || "",
    orderDate: order.order_date || "",
    expectedDate: order.expected_delivery_date || order.expected_date || "",
    receivedDate: order.received_date || "",
    status: order.status || "Draft",
    subtotal: money(order.subtotal),
    tax: money(order.tax),
    discount: money(order.discount),
    totalAmount: money(order.total_amount),
    notes: order.notes || "",
    items: order.items || [],
    raw: order,
  };
}

export function mapInventoryMovement(movement) {
  return {
    id: movement.id,
    material: movement.material?.name || "-",
    materialId: movement.material_id || movement.material?.id || "",
    project: movement.project?.name || movement.project?.project_name || "-",
    projectId: movement.project_id || movement.project?.id || "",
    type: movement.type || movement.movement_type,
    quantity: Number(movement.quantity || 0),
    unitCost: money(movement.unit_cost),
    totalCost: money(movement.total_cost),
    movementDate: movement.movement_date || "",
    reference: movement.reference || "",
    notes: movement.notes || "",
    createdBy: movement.creator?.name || "-",
    raw: movement,
  };
}

export function mapClient(client) {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone || "-",
    email: client.email || "-",
    address: client.address || "",
    location: client.location || "-",
    notes: client.notes || "",
    hasPortalAccess: Boolean(client.has_portal_access || client.portal_token_hash || client.portal_token_expires_at),
    passwordStatus: client.has_portal_access ? "Set" : "Not Set",
    portalLastLoginAt: client.portal_last_login_at || "",
    portalLastLogin: client.portal_last_login_at ? new Date(client.portal_last_login_at).toLocaleString() : "Never",
    projects: client.projects || [],
    raw: client,
  };
}

export function mapExpense(expense) {
  return {
    id: expense.id,
    title: expense.title || expense.item_name,
    expenseType: expense.expense_type || "project",
    expenseTypeLabel: expenseTypeLabel(expense.expense_type),
    project: expense.project?.name || expense.project?.project_name || "Unassigned",
    supplier: expense.supplier?.name || "-",
    employee: expense.employee?.name || "-",
    category: expense.category_model?.name || expense.category || "General",
    groupName: expense.category_model?.group_name || "-",
    quantity: Number(expense.quantity || 0),
    unitPrice: money(expense.unit_cost || expense.unit_price),
    amountValue: Number(expense.total_cost || expense.amount || 0),
    amount: money(expense.total_cost || expense.amount),
    date: expense.expense_date || "-",
    method: expense.payment_method || "-",
    paidBy: expense.paid_by || "-",
    receiptFile: expense.receipt_file || "",
    approvalStatus: expense.approval_status || "Approved",
    approvedBy: expense.approver?.name || "-",
    raw: expense,
  };
}

export function mapPayment(payment) {
  return {
    id: payment.id,
    type: payment.type || "payment",
    typeLabel: paymentTypeLabel(payment.type),
    isClientPayment: isClientPayment(payment.type),
    isSupplierPayment: isSupplierPayment(payment.type),
    project: payment.project?.name || payment.project?.project_name || "-",
    projectId: payment.project_id || payment.project?.id || "",
    client: payment.client?.name || "-",
    clientId: payment.client_id || payment.client?.id || "",
    supplier: payment.supplier?.name || "-",
    supplierId: payment.supplier_id || payment.supplier?.id || "",
    invoiceId: payment.invoice_id || payment.invoice?.id || "",
    amount: money(payment.amount),
    date: payment.payment_date || "-",
    method: payment.payment_method || payment.method || "-",
    paymentType: payment.payment_type || "Flexible payment",
    relatedStage: payment.related_stage || "-",
    referenceNumber: payment.reference_number || "-",
    receiptFile: payment.receipt_file || "",
    status: payment.status || "pending",
    raw: payment,
  };
}

export function mapInvoice(invoice) {
  return {
    id: invoice.id,
    number: invoice.invoice_number,
    internalReference: invoice.internal_reference || "",
    type: invoice.invoice_type || "client",
    client: invoice.client?.name || "-",
    clientId: invoice.client_id || "",
    supplier: invoice.supplier?.name || "-",
    supplierId: invoice.supplier_id || "",
    project: invoice.project?.name || invoice.project?.project_name || "-",
    projectId: invoice.project_id || "",
    issueDate: invoice.issue_date || invoice.invoice_date || "",
    invoiceDate: invoice.invoice_date || "",
    dueDate: invoice.due_date || "",
    subtotal: money(invoice.subtotal),
    discount: money(invoice.discount),
    tax: money(invoice.tax),
    total: money(invoice.total_amount),
    paid: money(invoice.paid_amount),
    balance: money(invoice.balance_due),
    status: invoice.status || "Unpaid",
    notes: invoice.notes || "",
    attachmentFile: invoice.attachment_file || "",
    items: invoice.items || [],
    raw: invoice,
  };
}

export function mapNotification(notification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type || "info",
    priority: notification.priority || "normal",
    module: notification.module || "",
    recordId: notification.record_id || "",
    link: notification.link || "",
    read: Boolean(notification.is_read),
    createdAt: notification.created_at ? new Date(notification.created_at).toLocaleString() : "-",
    raw: notification,
  };
}

export function mapOverhead(overhead) {
  return {
    id: overhead.id,
    title: overhead.title,
    category: overhead.category_model?.name || overhead.category || "General",
    amount: money(overhead.amount),
    date: overhead.overhead_date || "-",
    method: overhead.payment_method || "-",
    paidBy: overhead.paid_by || "-",
    receiptFile: overhead.receipt_file || "",
    notes: overhead.notes || "",
    raw: overhead,
  };
}

export function mapCategory(category) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    expenseType: category.expense_type || "project",
    expenseTypeLabel: expenseTypeLabel(category.expense_type),
    groupName: category.group_name || "",
    typeLabel: categoryTypeLabel(category.type),
    description: category.description || "",
    status: category.status || "Active",
    createdBy: category.creator?.name || "-",
    createdAt: category.created_at ? new Date(category.created_at).toLocaleDateString() : "-",
    raw: category,
  };
}

export function mapDocument(document) {
  const filePath = document.file_path || "";
  const fileType = document.file_type || "file";
  const category = document.document_category || "other";
  const isPhoto = category.toLowerCase() === "photo" || fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filePath);

  return {
    id: document.id,
    title: document.title,
    project: document.project?.project_name || document.project?.name || "General",
    projectId: document.project_id || document.project?.id || "",
    filePath,
    fileType,
    category,
    isPhoto,
    visibility: document.visibility || "internal",
    uploadedBy: document.uploader?.name || "-",
    createdAt: document.created_at ? new Date(document.created_at).toLocaleString() : "-",
    raw: document,
  };
}

export function mapTask(task) {
  const employee = task.assignee_employee || task.assigneeEmployee;
  return {
    id: task.id,
    title: task.title,
    project: task.project?.name || task.project?.project_name || "-",
    assignee: employee?.name || task.assignee?.name || "-",
    employeeId: task.employee_id || employee?.id || "",
    workDate: task.work_date || task.deadline || "-",
    relatedStage: task.related_stage || "-",
    progressAdded: Number(task.progress_added || 0),
    priority: task.priority || "Medium",
    status: task.status || "Pending",
    deadline: task.deadline || "-",
    notes: task.notes || "",
    adminNote: task.admin_note || "",
    approvedBy: task.approver?.name || "-",
    approvedAt: task.approved_at || "",
    raw: task,
  };
}

export function mapQuotation(quotation) {
  return {
    id: quotation.id,
    quotationNumber: quotation.quotation_number,
    title: quotation.title,
    client: quotation.client?.name || "-",
    clientId: quotation.client_id || quotation.client?.id || "",
    project: quotation.project?.name || quotation.project?.project_name || "-",
    projectId: quotation.project_id || quotation.project?.id || "",
    projectTitle: quotation.project_title || quotation.title,
    clientName: quotation.client_name || quotation.client?.name || "",
    projectType: quotation.project_type || "",
    location: quotation.location || quotation.project?.location || "",
    quotationDate: quotation.quotation_date || "",
    validUntil: quotation.valid_until || "",
    subtotal: money(quotation.subtotal),
    totalDiscount: money(quotation.total_discount || quotation.discount),
    totalTax: money(quotation.total_tax || quotation.tax),
    discount: money(quotation.discount),
    tax: money(quotation.tax),
    profitPercentage: money(quotation.profit_percentage),
    profitAmount: money(quotation.profit_amount),
    totalAmount: money(quotation.total_amount),
    grandTotal: money(quotation.grand_total || quotation.total_amount),
    paymentTerms: quotation.payment_terms || "",
    paymentAccountName: quotation.payment_account_name || "",
    paymentBank: quotation.payment_bank || "",
    paymentAccountNo: quotation.payment_account_no || "",
    paymentPhone: quotation.payment_phone || "",
    paymentNotes: quotation.payment_notes || "",
    depositPercentage: quotation.deposit_percentage || "",
    notes: quotation.notes || "",
    specialConditions: quotation.special_conditions || "",
    scopeExclusions: quotation.scope_exclusions || "",
    termsConditions: quotation.terms_conditions || "",
    footerNote: quotation.footer_note || "",
    status: quotation.status || "Draft",
    sentAt: quotation.sent_at,
    approvedAt: quotation.approved_at,
    lockedAt: quotation.locked_at,
    items: quotation.items || [],
    sections: quotation.sections || [],
    versions: quotation.versions || [],
    attachments: quotation.attachments || [],
    approvals: quotation.approvals || [],
    invoice: quotation.invoice || null,
    raw: quotation,
  };
}

export function mapEmployee(employee) {
  return {
    id: employee.id,
    name: employee.name,
    department: employee.department?.name || "-",
    departmentId: employee.department_id || employee.department?.id || "",
    position: employee.position || "-",
    specialty: employee.specialty || "",
    photo: employee.photo || "",
    phone: employee.phone || "-",
    email: employee.email || "-",
    address: employee.address || "",
    startDate: formatDateOnly(employee.employment_start_date) || "",
    contractType: employee.contract_type || "",
    salaryGrade: employee.salary_grade || "",
    emergencyContact: employee.emergency_contact_name || "",
    emergencyPhone: employee.emergency_contact_phone || "",
    emergencyContact2: employee.emergency_contact_2_name || "",
    emergencyPhone2: employee.emergency_contact_2_phone || "",
    status: employee.status || "Active",
    portalAccess: Boolean(employee.user_id || employee.user),
    passwordStatus: employee.user_id || employee.user ? "Set" : "Not Set",
    portalLastLoginAt: employee.portal_last_login_at || "",
    portalLastLogin: employee.portal_last_login_at ? new Date(employee.portal_last_login_at).toLocaleString() : "Never",
    dailyRate: money(employee.daily_rate),
    monthlySalary: money(employee.monthly_salary),
    notes: employee.notes || "",
    raw: employee,
  };
}

export function categoryTypeLabel(type) {
  const labels = {
    project_expense: "Project Expense",
    overhead: "Overhead",
    inventory: "Inventory",
    payroll: "Payroll",
    other: "Other",
  };
  return labels[type] || type || "Other";
}

export function expenseTypeLabel(type) {
  const labels = {
    project: "Project Expense",
    overhead: "Overhead",
    payroll: "Payroll",
  };
  return labels[type] || type || "Project Expense";
}

export async function login(payload) {
  const response = await api.post("/auth/login", payload);
  localStorage.setItem("q_interior_token", response.data.token);
  localStorage.setItem("q_interior_user", JSON.stringify(mapUser(response.data.user)));
  return response.data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    localStorage.removeItem("q_interior_token");
    localStorage.removeItem("q_interior_user");
  }
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  const user = mapUser(response.data);
  localStorage.setItem("q_interior_user", JSON.stringify(user));
  return user;
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("q_interior_user"));
  } catch {
    return null;
  }
}

export function userHasRole(roles) {
  const user = getStoredUser();
  const allowed = Array.isArray(roles) ? roles : [roles];
  const names = [user?.role, ...(user?.roles || []).map((role) => role.name)].filter(Boolean);
  return allowed.some((role) => names.includes(role));
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("q_interior_token"));
}

export async function getPhaseOneDashboard() {
  const response = await api.get("/dashboard/phase-one");
  return response.data;
}

export async function getExecutiveDashboard(params = {}) {
  const response = await api.get("/dashboard/executive", { params });
  return response.data;
}

export async function getDashboardSummary(params = {}) {
  const response = await api.get("/dashboard/summary", { params });
  return response.data;
}

export async function getClients() {
  const response = await api.get("/clients");
  return response.data.map(mapClient);
}

export async function getClient(id) {
  const response = await api.get(`/clients/${id}`);
  return mapClient(response.data);
}

export async function createClient(payload) {
  const response = await api.post("/clients", payload);
  return mapClient(response.data);
}

export async function updateClient(id, payload) {
  const response = await api.put(`/clients/${id}`, payload);
  return mapClient(response.data);
}

export async function resetClientPassword(id, payload) {
  const response = await api.post(`/clients/${id}/reset-password`, payload);
  return mapClient(response.data);
}

export async function deleteClient(id) {
  await api.delete(`/clients/${id}`);
}

export async function createProject(payload) {
  const response = await api.post("/projects", payload);
  return mapProject(response.data);
}

export async function getProject(id) {
  const response = await api.get(`/projects/${id}`);
  return mapProject(response.data);
}

export async function updateProject(id, payload) {
  const response = await api.put(`/projects/${id}`, payload);
  return mapProject(response.data);
}

export async function deleteProject(id) {
  await api.delete(`/projects/${id}`);
}

export async function getProjectBoard(params = {}) {
  const response = await api.get("/project-board", { params });
  return response.data;
}

export async function getProjectStages() {
  const response = await api.get("/project-stages");
  return response.data;
}

export async function updateProjectStage(id, project_stage_id) {
  const response = await api.patch(`/projects/${id}/stage`, { project_stage_id });
  return mapProject(response.data);
}

export async function getProjectTimeline(id) {
  const response = await api.get(`/projects/${id}/timeline`);
  return response.data;
}

export async function createProjectMember(payload) {
  const response = await api.post("/project-members", payload);
  return response.data;
}

export async function deleteProjectMember(id) {
  await api.delete(`/project-members/${id}`);
}

export async function getTasks(params = {}) {
  const response = await api.get("/tasks", { params });
  return response.data.map(mapTask);
}

export async function getTask(id) {
  const response = await api.get(`/tasks/${id}`);
  return mapTask(response.data);
}

export async function createTask(payload) {
  const response = await api.post("/tasks", payload);
  return mapTask(response.data);
}

export async function updateTaskStatus(id, status, note = "") {
  const response = await api.patch(`/tasks/${id}/status`, { status, note });
  return mapTask(response.data);
}

export async function approveTask(id, payload = {}) {
  const response = await api.post(`/tasks/${id}/approve`, payload);
  return mapTask(response.data);
}

export async function rejectTask(id, payload = {}) {
  const response = await api.post(`/tasks/${id}/reject`, payload);
  return mapTask(response.data);
}

export async function deleteTask(id) {
  await api.delete(`/tasks/${id}`);
}

export async function getTaskDailySummary() {
  const response = await api.get("/tasks/daily-summary");
  return response.data;
}

export async function addTaskComment(id, comment) {
  const response = await api.post(`/tasks/${id}/comments`, { comment });
  return response.data;
}

export async function uploadTaskAttachment(id, file) {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post(`/tasks/${id}/attachments`, form);
  return response.data;
}

export async function deleteTaskAttachment(id) {
  await api.delete(`/task-attachments/${id}`);
}

export async function checkOverdueTasks() {
  const response = await api.post("/tasks/check-overdue");
  return response.data;
}

export async function getExpenses(params = {}) {
  const response = await api.get("/expenses", { params });
  return response.data.map(mapExpense);
}

export async function createExpense(payload) {
  const response = await api.post("/expenses", payload);
  return mapExpense(response.data);
}

export async function getExpense(id) {
  const response = await api.get(`/expenses/${id}`);
  return mapExpense(response.data);
}

export async function updateExpense(id, payload) {
  const response = await api.put(`/expenses/${id}`, payload);
  return mapExpense(response.data);
}

export async function deleteExpense(id) {
  await api.delete(`/expenses/${id}`);
}

export async function approveExpense(id) {
  const response = await api.post(`/expenses/${id}/approve`);
  return mapExpense(response.data);
}

export async function rejectExpense(id) {
  const response = await api.post(`/expenses/${id}/reject`);
  return mapExpense(response.data);
}

export async function getPayments(params = {}) {
  const response = await api.get("/payments", { params });
  return response.data.map(mapPayment);
}

export async function createPayment(payload) {
  const response = await api.post("/payments", payload);
  return mapPayment(response.data);
}

export async function getPayment(id) {
  const response = await api.get(`/payments/${id}`);
  return mapPayment(response.data);
}

export async function updatePayment(id, payload) {
  const response = await api.put(`/payments/${id}`, payload);
  return mapPayment(response.data);
}

export async function deletePayment(id) {
  await api.delete(`/payments/${id}`);
}

export async function getSupplierPayments(params = {}) {
  const response = await api.get("/supplier-payments", { params });
  return response.data.map(mapPayment);
}

export async function getInvoices(params = {}) {
  const response = await api.get("/invoices", { params });
  return response.data.map(mapInvoice);
}

export async function createInvoice(payload) {
  const response = await api.post("/invoices", payload);
  return mapInvoice(response.data);
}

export async function updateInvoice(id, payload) {
  const response = await api.put(`/invoices/${id}`, payload);
  return mapInvoice(response.data);
}

export async function deleteInvoice(id) {
  await api.delete(`/invoices/${id}`);
}

export async function getSupplierInvoices(params = {}) {
  const response = await api.get("/supplier-invoices", { params });
  return response.data.map(mapInvoice);
}

export async function createSupplierInvoice(payload) {
  const response = await api.post("/supplier-invoices", { ...payload, invoice_type: "supplier" });
  return mapInvoice(response.data);
}

export async function sendInvoiceReminder(id) {
  const response = await api.post(`/invoices/${id}/send-reminder`);
  return mapInvoice(response.data);
}

export async function downloadInvoicePdf(invoice) {
  const id = typeof invoice === "object" ? invoice.id : invoice;
  const number = typeof invoice === "object" ? invoice.number || `invoice-${id}` : `invoice-${id}`;
  const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function getNotifications(params = {}) {
  const response = await api.get("/notifications", { params });
  return response.data.map(mapNotification);
}

export async function markNotificationRead(id) {
  const response = await api.post(`/notifications/${id}/read`);
  return mapNotification(response.data);
}

export async function markAllNotificationsRead() {
  const response = await api.post("/notifications/mark-all-read");
  return response.data;
}

export async function getProjects() {
  const response = await api.get("/projects");
  return response.data.map(mapProject);
}

export async function getProjectFinanceSummary(id) {
  const response = await api.get(`/projects/${id}/finance-summary`);
  return response.data;
}

export async function getSuppliers() {
  const response = await api.get("/suppliers");
  return response.data.map(mapSupplier);
}

export async function createSupplier(payload) {
  const response = await api.post("/suppliers", payload);
  return mapSupplier(response.data);
}

export async function updateSupplier(id, payload) {
  const response = await api.put(`/suppliers/${id}`, payload);
  return mapSupplier(response.data);
}

export async function deleteSupplier(id) {
  await api.delete(`/suppliers/${id}`);
}

export async function getInventoryOverview() {
  const response = await api.get("/inventory/overview");
  return response.data;
}

export async function getMaterialCategories() {
  const response = await api.get("/material-categories");
  return response.data;
}

export async function createMaterialCategory(payload) {
  const response = await api.post("/material-categories", payload);
  return response.data;
}

export async function updateMaterialCategory(id, payload) {
  const response = await api.put(`/material-categories/${id}`, payload);
  return response.data;
}

export async function deleteMaterialCategory(id) {
  await api.delete(`/material-categories/${id}`);
}

export async function getMaterials(params = {}) {
  const response = await api.get("/materials", { params });
  return response.data.map(mapMaterial);
}

export async function createMaterial(payload) {
  const response = await api.post("/materials", payload);
  return mapMaterial(response.data);
}

export async function updateMaterial(id, payload) {
  const response = await api.put(`/materials/${id}`, payload);
  return mapMaterial(response.data);
}

export async function deleteMaterial(id) {
  await api.delete(`/materials/${id}`);
}

export async function getInventoryMovements(params = {}) {
  const response = await api.get("/inventory-movements", { params });
  return response.data.map(mapInventoryMovement);
}

export async function createInventoryMovement(payload) {
  const response = await api.post("/inventory-movements", payload);
  return mapInventoryMovement(response.data);
}

export async function stockInMaterial(id, payload) {
  const response = await api.post(`/materials/${id}/stock-in`, payload);
  return mapInventoryMovement(response.data);
}

export async function stockOutMaterial(id, payload) {
  const response = await api.post(`/materials/${id}/stock-out`, payload);
  return mapInventoryMovement(response.data);
}

export async function adjustMaterialStock(id, payload) {
  const response = await api.post(`/materials/${id}/adjust-stock`, payload);
  return mapInventoryMovement(response.data);
}

export async function getPurchaseOrders(params = {}) {
  const response = await api.get("/purchase-orders", { params });
  return response.data.map(mapPurchaseOrder);
}

export async function createPurchaseOrder(payload) {
  const response = await api.post("/purchase-orders", payload);
  return mapPurchaseOrder(response.data);
}

export async function updatePurchaseOrder(id, payload) {
  const response = await api.put(`/purchase-orders/${id}`, payload);
  return mapPurchaseOrder(response.data);
}

export async function deletePurchaseOrder(id) {
  await api.delete(`/purchase-orders/${id}`);
}

export async function receivePurchaseOrder(id) {
  const response = await api.post(`/purchase-orders/${id}/receive`);
  return mapPurchaseOrder(response.data);
}

export async function cancelPurchaseOrder(id) {
  const response = await api.post(`/purchase-orders/${id}/cancel`);
  return mapPurchaseOrder(response.data);
}

export async function getSupplierBalance(id) {
  const response = await api.get(`/suppliers/${id}/balance`);
  return response.data;
}

export async function getProjectMaterialsUsed(id) {
  const response = await api.get(`/projects/${id}/materials-used`);
  return response.data;
}

export async function getInventoryReport(type, params = {}) {
  const response = await api.get(`/inventory/reports/${type}`, { params });
  return response.data;
}

export async function getOverheads() {
  const response = await api.get("/overheads");
  return response.data.map(mapOverhead);
}

export async function createOverhead(payload) {
  const response = await api.post("/overheads", payload);
  return mapOverhead(response.data);
}

export async function getOverhead(id) {
  const response = await api.get(`/overheads/${id}`);
  return mapOverhead(response.data);
}

export async function updateOverhead(id, payload) {
  const response = await api.put(`/overheads/${id}`, payload);
  return mapOverhead(response.data);
}

export async function deleteOverhead(id) {
  await api.delete(`/overheads/${id}`);
}

export async function getFinanceOverview() {
  const response = await api.get("/finance/overview");
  return response.data;
}

export async function getFinancePnl(params = {}) {
  const response = await api.get("/finance/pnl", { params });
  return response.data;
}

export async function getProjectProfitReport(params = {}) {
  const response = await api.get("/finance/project-profit-report", { params });
  return response.data;
}

export async function getOverheadReport(params = {}) {
  const response = await api.get("/finance/overhead-report", { params });
  return response.data;
}

export async function getPayrollReport(params = {}) {
  const response = await api.get("/finance/payroll-report", { params });
  return response.data;
}

export async function getQuotationReport() {
  const response = await api.get("/reports/quotations");
  return response.data;
}

export async function getHrOverview() {
  const response = await api.get("/hr/overview");
  return response.data;
}

export async function getHrAttendanceAnalytics(params = {}) {
  const response = await api.get("/hr/attendance/analytics", { params });
  return response.data;
}

export async function getOfficeLocations() {
  const response = await api.get("/hr/office-locations");
  return response.data;
}

export async function saveOfficeLocation(id, payload) {
  const response = id ? await api.put(`/hr/office-locations/${id}`, payload) : await api.post("/hr/office-locations", payload);
  return response.data;
}

export async function getAttendanceAttemptLogs(params = {}) {
  const response = await api.get("/hr/attendance/attempt-logs", { params });
  return response.data;
}

export async function getEmployees(params = {}) {
  const response = await api.get("/employees", { params });
  return response.data.map(mapEmployee);
}

export async function getEmployee(id) {
  const response = await api.get(`/employees/${id}`);
  return { ...mapEmployee(response.data), raw: response.data };
}

export async function createEmployee(payload) {
  const response = await api.post("/employees", payload);
  return mapEmployee(response.data);
}

export async function updateEmployee(id, payload) {
  if (payload instanceof FormData) {
    payload.set("_method", "PUT");
    const response = await api.post(`/employees/${id}`, payload);
    return mapEmployee(response.data);
  }

  const response = await api.put(`/employees/${id}`, payload);
  return mapEmployee(response.data);
}

export async function resetEmployeePassword(id, payload) {
  const response = await api.post(`/employees/${id}/reset-password`, payload);
  return mapEmployee(response.data);
}

export async function deleteEmployee(id) {
  await api.delete(`/employees/${id}`);
}

export async function uploadEmployeeDocument(id, payload) {
  const response = await api.post(`/employees/${id}/documents`, payload);
  return response.data;
}

export async function getDepartments() {
  const response = await api.get("/departments");
  return response.data;
}

export async function createDepartment(payload) {
  const response = await api.post("/departments", payload);
  return response.data;
}

export async function getAttendances(params = {}) {
  const response = await api.get("/attendances", { params });
  return response.data;
}

export async function checkIn(employee_id) {
  const response = await api.post("/attendances/check-in", { employee_id });
  return response.data;
}

export async function checkOut(employee_id) {
  const response = await api.post("/attendances/check-out", { employee_id });
  return response.data;
}

export async function createManualAttendance(payload) {
  const response = await api.post("/attendances/manual", payload);
  return response.data;
}

export async function getLeaveRequests(params = {}) {
  const response = await api.get("/leave-requests", { params });
  return response.data;
}

export async function createLeaveRequest(payload) {
  const response = await api.post("/leave-requests", payload);
  return response.data;
}

export async function approveLeave(id) {
  const response = await api.post(`/leave-requests/${id}/approve`);
  return response.data;
}

export async function rejectLeave(id, rejection_reason = "") {
  const response = await api.post(`/leave-requests/${id}/reject`, { rejection_reason });
  return response.data;
}

export async function getLeaveBalances(params = {}) {
  const response = await api.get("/leave-balances", { params });
  return response.data;
}

export async function getHolidays() {
  const response = await api.get("/holidays");
  return response.data;
}

export async function createHoliday(payload) {
  const response = await api.post("/holidays", payload);
  return response.data;
}

export async function getPayrolls(params = {}) {
  const response = await api.get("/payrolls", { params });
  return response.data;
}

export async function generatePayroll(payload) {
  const response = await api.post("/payrolls/generate", payload);
  return response.data;
}

export async function updatePayroll(id, payload) {
  const response = await api.put(`/payrolls/${id}`, payload);
  return response.data;
}

export async function deletePayroll(id) {
  await api.delete(`/payrolls/${id}`);
}

export async function downloadPayrollExport(format = "excel", params = {}) {
  const response = await api.get("/payrolls/export", { params: { ...params, format }, responseType: "blob" });
  const extension = format === "pdf" ? "pdf" : "csv";
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payroll-export.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function approvePayroll(id) {
  const response = await api.post(`/payrolls/${id}/approve`);
  return response.data;
}

export async function markPayrollPaid(id, payload = {}) {
  const response = await api.post(`/payrolls/${id}/mark-paid`, payload);
  return response.data;
}

export function getPayslipUrl(id) {
  const token = localStorage.getItem("q_interior_token");
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${api.defaults.baseURL}/payrolls/${id}/payslip${suffix}`;
}

export async function getSalaryHistories(params = {}) {
  const response = await api.get("/salary-histories", { params });
  return response.data;
}

export async function getPerformanceReviews(params = {}) {
  const response = await api.get("/performance-reviews", { params });
  return response.data;
}

export async function createPerformanceReview(payload) {
  const response = await api.post("/performance-reviews", payload);
  return response.data;
}

export async function getEmployeeGoals(params = {}) {
  const response = await api.get("/employee-goals", { params });
  return response.data;
}

export async function createEmployeeGoal(payload) {
  const response = await api.post("/employee-goals", payload);
  return response.data;
}

export async function getQuotations(params = {}) {
  const response = await api.get("/quotations", { params });
  return response.data.map(mapQuotation);
}

export async function getQuotation(id) {
  const response = await api.get(`/quotations/${id}`);
  return mapQuotation(response.data);
}

export async function createQuotation(payload) {
  const response = await api.post("/quotations", payload);
  return mapQuotation(response.data);
}

export async function updateQuotation(id, payload) {
  const response = await api.put(`/quotations/${id}`, payload);
  return mapQuotation(response.data);
}

export async function deleteQuotation(id) {
  await api.delete(`/quotations/${id}`);
}

export async function sendQuotation(id) {
  const response = await api.post(`/quotations/${id}/send`);
  return mapQuotation(response.data);
}

export async function reviseQuotation(id, payload = {}) {
  const response = await api.post(`/quotations/${id}/revise`, payload);
  return mapQuotation(response.data);
}

export async function convertQuotation(id) {
  const response = await api.post(`/quotations/${id}/convert`);
  return mapQuotation(response.data);
}

export async function uploadQuotationAttachment(id, payload) {
  const response = await api.post(`/quotations/${id}/attachments`, payload);
  return response.data;
}

export function getQuotationPdfUrl(id) {
  const token = localStorage.getItem("q_interior_token");
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${api.defaults.baseURL}/quotations/${id}/pdf${suffix}`;
}

export function getQuotationPreviewUrl(id) {
  const token = localStorage.getItem("q_interior_token");
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${api.defaults.baseURL}/quotations/${id}/preview${suffix}`;
}

export async function getExpenseCategories(params = {}) {
  const response = await api.get("/expense-categories", { params });
  return response.data.map(mapCategory);
}

export async function createExpenseCategory(payload) {
  const response = await api.post("/expense-categories", payload);
  return mapCategory(response.data);
}

export async function updateExpenseCategory(id, payload) {
  const response = await api.put(`/expense-categories/${id}`, payload);
  return mapCategory(response.data);
}

export async function deleteExpenseCategory(id) {
  await api.delete(`/expense-categories/${id}`);
}

export async function updateExpenseCategoryStatus(id, status) {
  const response = await api.patch(`/expense-categories/${id}/status`, { status });
  return mapCategory(response.data);
}

export async function getProjectMembers(projectId) {
  const response = await api.get(`/projects/${projectId}/members`);
  return response.data;
}

export async function addProjectMember(projectId, payload) {
  const response = await api.post(`/projects/${projectId}/members`, payload);
  return response.data;
}

export async function updateProjectMember(projectId, memberId, payload) {
  const response = await api.put(`/projects/${projectId}/members/${memberId}`, payload);
  return response.data;
}

export async function removeProjectMember(projectId, memberId) {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
}

export async function getDocuments(params = {}) {
  const response = await api.get("/documents", { params });
  return response.data.map(mapDocument);
}

export async function createDocument(payload) {
  const response = await api.post("/documents", payload);
  return mapDocument(response.data);
}

export async function updateDocument(id, payload) {
  if (payload instanceof FormData && !payload.has("_method")) {
    payload.append("_method", "PUT");
  }
  const response = await api.post(`/documents/${id}`, payload);
  return mapDocument(response.data);
}

export async function deleteDocument(id) {
  await api.delete(`/documents/${id}`);
}

export function getDocumentDownloadUrl(id) {
  return `${api.defaults.baseURL}/documents/${id}/download`;
}

export async function downloadDocumentFile(fileRecord) {
  const id = typeof fileRecord === "object" ? fileRecord.id : fileRecord;
  const title = typeof fileRecord === "object" ? fileRecord.title || `document-${id}` : `document-${id}`;
  const filePath = typeof fileRecord === "object" ? fileRecord.filePath || fileRecord.file_path || "" : "";
  const extension = filePath.includes(".") ? `.${filePath.split(".").pop()}` : "";
  const response = await api.get(`/documents/${id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function getDocumentStorageUrl(filePath) {
  if (!filePath) return "";
  const base = api.defaults.baseURL || "";
  if (base === "/api") return `/storage/${filePath}`;
  const root = base.endsWith("/api") ? base.slice(0, -4) : base.replace(/\/api\/?$/, "");
  return `${root}/storage/${filePath}`;
}

export async function getUsers() {
  const response = await api.get("/users");
  return response.data.map(mapUser);
}

export async function createUser(payload) {
  const response = await api.post("/users", payload);
  return mapUser(response.data);
}

export async function updateUser(id, payload) {
  const response = await api.put(`/users/${id}`, payload);
  return mapUser(response.data);
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

export async function getRoles() {
  const response = await api.get("/roles");
  return response.data.map(mapRole);
}

export async function createRole(payload) {
  const response = await api.post("/roles", payload);
  return mapRole(response.data);
}

export async function getSettings() {
  const response = await api.get("/settings");
  return response.data.map(mapSetting);
}

export async function saveSetting(payload) {
  const response = await api.post("/settings", payload);
  return mapSetting(response.data);
}

export async function getReportsCenter() {
  const response = await api.get("/reports");
  return response.data;
}

export async function getReport(key, params = {}) {
  const response = await api.get(`/reports/${key}`, { params });
  return response.data;
}

export function getReportExportUrl(key, format = "excel", params = {}) {
  const token = localStorage.getItem("q_interior_token");
  const query = new URLSearchParams({ ...params, format });
  if (token) query.set("token", token);
  return `${api.defaults.baseURL}/reports/${key}/export?${query.toString()}`;
}

export async function downloadReportExport(key, format = "excel", params = {}) {
  const response = await api.get(`/reports/${key}/export`, { params: { ...params, format }, responseType: "blob" });
  const extension = format === "pdf" ? "pdf" : format === "print" ? "html" : "csv";
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${key}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function getBackups() {
  const response = await api.get("/backups");
  return response.data;
}

export async function createBackup(payload = { backup_type: "full" }) {
  const response = await api.post("/backups", payload);
  return response.data;
}

export async function getAuditLogs(params = {}) {
  const response = await api.get("/audit-logs", { params });
  return response.data;
}

const portalApi = axios.create({
  baseURL: apiBaseUrl,
  headers: { Accept: "application/json" },
});

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("q_client_portal_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function clientPortalLogin(payload) {
  const response = await portalApi.post("/client-portal/login", payload);
  localStorage.setItem("q_client_portal_token", response.data.token);
  localStorage.setItem("q_client_portal_client", JSON.stringify(response.data.client));
  return response.data;
}

export async function clientPortalLogout() {
  try {
    await portalApi.post("/client-portal/logout");
  } finally {
    logoutClientPortal();
  }
}

export function isClientPortalAuthenticated() {
  return Boolean(localStorage.getItem("q_client_portal_token"));
}

export function logoutClientPortal() {
  localStorage.removeItem("q_client_portal_token");
  localStorage.removeItem("q_client_portal_client");
}

export async function getClientPortalDashboard() {
  const response = await portalApi.get("/client-portal/dashboard");
  return response.data;
}

export async function getClientPortalTimeline(projectId) {
  const response = await portalApi.get(`/client-portal/projects/${projectId}/timeline`);
  return response.data;
}

export function getClientPortalDocumentUrl(id) {
  const token = localStorage.getItem("q_client_portal_token");
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${portalApi.defaults.baseURL}/client-portal/documents/${id}/download${suffix}`;
}

export async function getClientPortalQuotations() {
  const response = await portalApi.get("/client-portal/quotations");
  return response.data.map(mapQuotation);
}

export function getClientPortalQuotationPdfUrl(id) {
  const token = localStorage.getItem("q_client_portal_token");
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${portalApi.defaults.baseURL}/client-portal/quotations/${id}/pdf${suffix}`;
}

export async function sendClientPortalMessage(payload) {
  const response = await portalApi.post("/client-portal/messages", payload);
  return response.data;
}

export async function decideClientApproval(id, action, payload) {
  const response = await portalApi.post(`/client-portal/approvals/${id}/${action}`, payload);
  return response.data;
}

export async function decideClientQuotation(id, action, payload) {
  const response = await portalApi.post(`/client-portal/quotations/${id}/${action}`, payload);
  return mapQuotation(response.data);
}

export async function getClientMessages(params = {}) {
  const response = await api.get("/client-messages", { params });
  return response.data;
}

export async function replyClientMessage(projectId, message) {
  const response = await api.post(`/projects/${projectId}/client-messages/reply`, { message });
  return response.data;
}

export async function markClientMessageRead(id) {
  const response = await api.patch(`/client-messages/${id}/read`);
  return response.data;
}

const employeeApi = axios.create({
  baseURL: apiBaseUrl,
  headers: { Accept: "application/json" },
});

employeeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("q_employee_portal_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

employeeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("q_employee_portal_token");
      localStorage.removeItem("q_employee_portal_employee");
      if (window.location.pathname.startsWith("/employee-portal")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export async function employeePortalLogin(payload) {
  const response = await employeeApi.post("/employee/login", payload);
  localStorage.setItem("q_employee_portal_token", response.data.token);
  localStorage.setItem("q_employee_portal_employee", JSON.stringify(response.data.employee));
  return response.data;
}

export function isEmployeePortalAuthenticated() {
  return Boolean(localStorage.getItem("q_employee_portal_token"));
}

export function logoutEmployeePortal() {
  localStorage.removeItem("q_employee_portal_token");
  localStorage.removeItem("q_employee_portal_employee");
}

export async function employeePortalLogout() {
  try {
    await employeeApi.post("/employee/logout");
  } finally {
    logoutEmployeePortal();
  }
}

export async function getEmployeePortalDashboard() {
  const response = await employeeApi.get("/employee/dashboard");
  return response.data;
}

export async function employeeCheckIn(payload) {
  const response = await employeeApi.post("/employee/attendance/check-in", payload);
  return response.data;
}

export async function employeeCheckOut(payload) {
  const response = await employeeApi.post("/employee/attendance/check-out", payload);
  return response.data;
}

export async function getEmployeeTodayAttendance() {
  const response = await employeeApi.get("/employee/attendance/today");
  return response.data;
}

export async function getEmployeeAttendanceAnalytics(params = {}) {
  const response = await employeeApi.get("/employee/attendance/analytics", { params });
  return response.data;
}

export async function getEmployeePortalAttendance(params = {}) {
  const response = await employeeApi.get("/employee/attendance/monthly", { params });
  return response.data;
}

export async function getEmployeePortalLeaveRequests() {
  const response = await employeeApi.get("/employee/leave-requests");
  return response.data;
}

export async function createEmployeePortalLeaveRequest(payload) {
  const response = await employeeApi.post("/employee/leave-requests", payload);
  return response.data;
}

export async function getEmployeePortalLeaveBalances() {
  const response = await employeeApi.get("/employee/leave-balances");
  return response.data;
}

export async function getEmployeePortalPayslips() {
  const response = await employeeApi.get("/employee/payslips");
  return response.data;
}

export async function getEmployeePortalReviews() {
  const response = await employeeApi.get("/employee/performance-reviews");
  return response.data;
}

export default api;
