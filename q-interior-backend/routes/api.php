<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ClientPortalQuotationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectBoardController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OverheadController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\FinanceOverviewController;
use App\Http\Controllers\Api\HrController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\ProjectStageController;
use App\Http\Controllers\Api\TaskCommentController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskAttachmentController;
use App\Http\Controllers\Api\TeamMemberController;
use App\Http\Controllers\Api\ClientPortalController;
use App\Http\Controllers\Api\ClientMessageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployeePortalController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PhaseOneDashboardController;
use App\Http\Controllers\Api\ProjectMemberController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\UserController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => 'Q Interior Design System',
    ]);
});

Route::get('/health/database', function () {
    try {
        $requiredTables = [
            'users',
            'roles',
            'permissions',
            'settings',
            'clients',
            'projects',
            'expense_categories',
            'project_stages',
            'departments',
        ];

        $connection = DB::connection();
        $connection->getPdo();

        $database = $connection->getDatabaseName();
        $driver = $connection->getDriverName();

        $requiredTableStatus = collect($requiredTables)
            ->mapWithKeys(fn (string $table) => [$table => Schema::hasTable($table)]);

        $allTables = collect(match ($driver) {
            'mysql', 'mariadb' => DB::select('SHOW TABLES'),
            'sqlite' => DB::select("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"),
            'pgsql' => DB::select("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"),
            'sqlsrv' => DB::select("SELECT table_name AS name FROM information_schema.tables WHERE table_type = 'BASE TABLE'"),
            default => [],
        })
            ->map(fn (object $table) => array_values((array) $table)[0] ?? null)
            ->filter()
            ->sort()
            ->values();

        $migrationStatus = Schema::hasTable('migrations')
            ? [
                'table_exists' => true,
                'migration_count' => DB::table('migrations')->count(),
                'latest_batch' => DB::table('migrations')->max('batch'),
                'latest_migration' => DB::table('migrations')->orderByDesc('batch')->orderByDesc('migration')->value('migration'),
            ]
            : [
                'table_exists' => false,
                'migration_count' => 0,
                'latest_batch' => null,
                'latest_migration' => null,
            ];

        return response()->json([
            'status' => $requiredTableStatus->contains(false) ? 'error' : 'ok',
            'database' => $database,
            'required_tables' => $requiredTableStatus,
            'table_count' => $allTables->count(),
            'all_tables' => $allTables,
            'migration_status' => $migrationStatus,
        ]);
    } catch (\Throwable $exception) {
        return response()->json([
            'status' => 'error',
            'database' => DB::connection()->getDatabaseName(),
            'required_tables' => null,
            'table_count' => 0,
            'all_tables' => [],
            'migration_status' => null,
            'message' => 'Database health check failed.',
        ], 500);
    }
});

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/employee/login', [EmployeePortalController::class, 'login']);
Route::post('/client-portal/login', [ClientPortalController::class, 'login']);
Route::post('/client-portal/logout', [ClientPortalController::class, 'logout']);
Route::get('/client-portal/dashboard', [ClientPortalController::class, 'dashboard']);
Route::get('/client-portal/projects/{project}', [ClientPortalController::class, 'project']);
Route::get('/client-portal/projects/{project}/timeline', [ClientPortalController::class, 'timeline']);
Route::get('/client-portal/documents/{document}/download', [ClientPortalController::class, 'document']);
Route::post('/client-portal/messages', [ClientPortalController::class, 'message']);
Route::post('/client-portal/approvals/{approval}/approve', [ClientPortalController::class, 'approve']);
Route::post('/client-portal/approvals/{approval}/reject', [ClientPortalController::class, 'reject']);
Route::post('/client-portal/approvals/{approval}/revision', [ClientPortalController::class, 'revision']);
Route::get('/client-portal/quotations', [ClientPortalQuotationController::class, 'index']);
Route::get('/client-portal/quotations/{quotation}', [ClientPortalQuotationController::class, 'show']);
Route::get('/client-portal/quotations/{quotation}/pdf', [ClientPortalQuotationController::class, 'pdf']);
Route::post('/client-portal/quotations/{quotation}/approve', [ClientPortalQuotationController::class, 'approve']);
Route::post('/client-portal/quotations/{quotation}/reject', [ClientPortalQuotationController::class, 'reject']);
Route::post('/client-portal/quotations/{quotation}/revision', [ClientPortalQuotationController::class, 'revision']);
Route::post('/client-portal/quotations/{quotation}/request-revision', [ClientPortalQuotationController::class, 'revision']);
Route::get('/quotations/{quotation}/pdf', [QuotationController::class, 'pdf']);
Route::get('/quotations/{quotation}/preview', [QuotationController::class, 'preview']);
Route::get('/payrolls/{payroll}/payslip', [HrController::class, 'payslip']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/employee/me', [EmployeePortalController::class, 'me']);
    Route::post('/employee/logout', [EmployeePortalController::class, 'logout']);
    Route::get('/employee/dashboard', [EmployeePortalController::class, 'dashboard']);
    Route::post('/employee/attendance/check-in', [EmployeePortalController::class, 'checkIn']);
    Route::post('/employee/attendance/check-out', [EmployeePortalController::class, 'checkOut']);
    Route::get('/employee/attendance/today', [EmployeePortalController::class, 'todayAttendance']);
    Route::get('/employee/attendance/analytics', [EmployeePortalController::class, 'attendanceAnalytics']);
    Route::get('/employee/attendance', [EmployeePortalController::class, 'attendance']);
    Route::get('/employee/attendance/monthly', [EmployeePortalController::class, 'monthlyAttendance']);
    Route::get('/employee/projects', [EmployeePortalController::class, 'projects']);
    Route::get('/employee/project-documents', [EmployeePortalController::class, 'projectDocuments']);
    Route::post('/employee/project-documents', [EmployeePortalController::class, 'storeProjectDocument']);
    Route::post('/employee/project-documents/{document}', [EmployeePortalController::class, 'updateProjectDocument']);
    Route::put('/employee/project-documents/{document}', [EmployeePortalController::class, 'updateProjectDocument']);
    Route::delete('/employee/project-documents/{document}', [EmployeePortalController::class, 'destroyProjectDocument']);
    Route::get('/employee/project-documents/{document}/download', [EmployeePortalController::class, 'downloadProjectDocument']);
    Route::get('/employee/documents', [EmployeePortalController::class, 'documents']);
    Route::post('/employee/documents', [EmployeePortalController::class, 'storeDocument']);
    Route::get('/employee/documents/{employeeDocument}/download', [EmployeePortalController::class, 'downloadDocument']);
    Route::get('/employee/leave-requests', [EmployeePortalController::class, 'leaveRequests']);
    Route::post('/employee/leave-requests', [EmployeePortalController::class, 'storeLeaveRequest']);
    Route::get('/employee/leave-balances', [EmployeePortalController::class, 'leaveBalances']);
    Route::get('/employee/payslips', [EmployeePortalController::class, 'payslips']);
    Route::get('/employee/performance-reviews', [EmployeePortalController::class, 'performanceReviews']);

    Route::get('/dashboard/phase-one', PhaseOneDashboardController::class);
    Route::get('/dashboard/summary', [ReportsController::class, 'dashboardSummary']);
    Route::get('/dashboard/executive', [ReportsController::class, 'executiveDashboard']);
    Route::get('/reports', [ReportsController::class, 'index'])->middleware('role:admin,manager,finance');
    Route::get('/backups', [BackupController::class, 'index'])->middleware('role:admin');
    Route::post('/backups', [BackupController::class, 'store'])->middleware('role:admin');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('role:admin');
    Route::apiResource('users', UserController::class)->middleware('role:admin,manager');
    Route::get('/roles', [RoleController::class, 'index'])->middleware('role:admin,manager');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('role:admin');
    Route::get('/roles/{role}', [RoleController::class, 'show'])->middleware('role:admin,manager');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('role:admin');
    Route::patch('/roles/{role}', [RoleController::class, 'update'])->middleware('role:admin');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('role:admin');
    Route::apiResource('permissions', PermissionController::class)->middleware('role:admin');
    Route::apiResource('clients', ClientController::class);
    Route::post('/clients/{client}/reset-password', [ClientController::class, 'resetPassword'])->middleware('role:admin,manager');
    Route::apiResource('projects', ProjectController::class);
    Route::get('/project-board', ProjectBoardController::class);
    Route::get('/project-stages', [ProjectStageController::class, 'index']);
    Route::patch('/projects/{project}/stage', [ProjectController::class, 'stage']);
    Route::get('/projects/{project}/timeline', [ProjectController::class, 'timeline']);
    Route::get('/projects/{project}/finance-summary', [ProjectController::class, 'financeSummary'])->middleware('role:admin,manager,finance');
    Route::get('/projects/{project}/expenses', [ProjectController::class, 'expenses'])->middleware('role:admin,manager,finance');
    Route::get('/projects/{project}/payments', [ProjectController::class, 'payments'])->middleware('role:admin,manager,finance');
    Route::post('/projects/{project}/payments', [ProjectController::class, 'storePayment'])->middleware('role:admin,manager,finance');
    Route::get('/projects/{project}/members', [ProjectMemberController::class, 'projectIndex']);
    Route::post('/projects/{project}/members', [ProjectMemberController::class, 'projectStore'])->middleware('role:admin,manager');
    Route::put('/projects/{project}/members/{projectMember}', [ProjectMemberController::class, 'projectUpdate'])->middleware('role:admin,manager');
    Route::delete('/projects/{project}/members/{projectMember}', [ProjectMemberController::class, 'projectDestroy'])->middleware('role:admin,manager');
    Route::apiResource('project-members', ProjectMemberController::class);
    Route::apiResource('documents', DocumentController::class);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::apiResource('notifications', NotificationController::class);
    Route::apiResource('settings', SettingController::class)->middleware('role:admin');

    Route::apiResource('suppliers', SupplierController::class);
    Route::get('/suppliers/{supplier}/expenses', [SupplierController::class, 'expenses'])->middleware('role:admin,manager,finance,staff');
    Route::get('/suppliers/{supplier}/invoices', [SupplierController::class, 'invoices'])->middleware('role:admin,manager,finance,staff');
    Route::get('/suppliers/{supplier}/payments', [SupplierController::class, 'payments'])->middleware('role:admin,manager,finance,staff');
    Route::apiResource('expenses', ExpenseController::class);
    Route::post('/expenses/{expense}/approve', [ExpenseController::class, 'approve']);
    Route::post('/expenses/{expense}/reject', [ExpenseController::class, 'reject']);
    Route::apiResource('payments', PaymentController::class);
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
    Route::post('/invoices/{invoice}/send-reminder', [InvoiceController::class, 'sendReminder']);
    Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'sendReminder']);
    Route::post('/invoices/{invoice}/mark-sent', [InvoiceController::class, 'markSent']);
    Route::post('/invoices/{invoice}/upload-file', [InvoiceController::class, 'uploadFile']);
    Route::get('/supplier-invoices', [InvoiceController::class, 'index'])->defaults('invoice_type', 'supplier');
    Route::post('/supplier-invoices', [InvoiceController::class, 'store'])->defaults('invoice_type', 'supplier');
    Route::get('/supplier-invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::put('/supplier-invoices/{invoice}', [InvoiceController::class, 'update']);
    Route::delete('/supplier-invoices/{invoice}', [InvoiceController::class, 'destroy']);
    Route::post('/supplier-invoices/{invoice}/upload-file', [InvoiceController::class, 'uploadFile']);
    Route::get('/supplier-payments', [PaymentController::class, 'index'])->defaults('type', 'supplier');
    Route::post('/supplier-payments', [PaymentController::class, 'store'])->defaults('type', 'supplier');
    Route::put('/supplier-payments/{payment}', [PaymentController::class, 'update']);
    Route::delete('/supplier-payments/{payment}', [PaymentController::class, 'destroy']);
    Route::apiResource('invoices', InvoiceController::class);
    Route::apiResource('overheads', OverheadController::class);
    Route::get('/tasks/daily-summary', [TaskController::class, 'dailySummary']);
    Route::post('/tasks/check-overdue', [TaskController::class, 'checkOverdue'])->middleware('role:admin,manager');
    Route::post('/tasks/{task}/approve', [TaskController::class, 'approve'])->middleware('role:admin,manager');
    Route::post('/tasks/{task}/reject', [TaskController::class, 'reject'])->middleware('role:admin,manager');
    Route::apiResource('tasks', TaskController::class);
    Route::patch('/tasks/{task}/status', [TaskController::class, 'status']);
    Route::post('/tasks/{task}/comments', [TaskCommentController::class, 'store']);
    Route::post('/tasks/{task}/attachments', [TaskAttachmentController::class, 'store']);
    Route::delete('/task-attachments/{attachment}', [TaskAttachmentController::class, 'destroy']);
    Route::get('/client-messages', [ClientMessageController::class, 'index']);
    Route::post('/projects/{project}/client-messages/reply', [ClientMessageController::class, 'reply']);
    Route::patch('/client-messages/{message}/read', [ClientMessageController::class, 'markRead']);
    Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
    Route::get('/expense-categories', [ExpenseCategoryController::class, 'index'])->middleware('role:admin,manager,finance,staff');
    Route::post('/expense-categories', [ExpenseCategoryController::class, 'store'])->middleware('role:admin,manager,finance');
    Route::get('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show'])->middleware('role:admin,manager,finance,staff');
    Route::put('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->middleware('role:admin,manager,finance');
    Route::patch('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->middleware('role:admin,manager,finance');
    Route::delete('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->middleware('role:admin,manager,finance');
    Route::patch('/expense-categories/{expenseCategory}/status', [ExpenseCategoryController::class, 'status'])->middleware('role:admin,manager,finance');
    Route::patch('/team-members/{teamMember}/status', [TeamMemberController::class, 'status'])->middleware('role:admin,manager');
    Route::get('/team-members', [TeamMemberController::class, 'index'])->middleware('role:admin,manager');
    Route::post('/team-members', [TeamMemberController::class, 'store'])->middleware('role:admin,manager');
    Route::get('/team-members/{teamMember}', [TeamMemberController::class, 'show'])->middleware('role:admin,manager');
    Route::put('/team-members/{teamMember}', [TeamMemberController::class, 'update'])->middleware('role:admin,manager');
    Route::patch('/team-members/{teamMember}', [TeamMemberController::class, 'update'])->middleware('role:admin,manager');
    Route::delete('/team-members/{teamMember}', [TeamMemberController::class, 'destroy'])->middleware('role:admin,manager');
    Route::get('/finance/overview', FinanceOverviewController::class);
    Route::get('/finance/pnl', [FinanceOverviewController::class, 'pnl'])->middleware('role:admin,manager,finance');
    Route::get('/finance/project-profit-report', [FinanceOverviewController::class, 'projectProfitReport'])->middleware('role:admin,manager,finance');
    Route::get('/finance/overhead-report', [FinanceOverviewController::class, 'overheadReport'])->middleware('role:admin,manager,finance');
    Route::get('/finance/payroll-report', [FinanceOverviewController::class, 'payrollReport'])->middleware('role:admin,manager,finance');
    Route::get('/inventory/overview', [InventoryController::class, 'overview'])->middleware('role:admin,manager,finance,staff');
    Route::get('/material-categories', [InventoryController::class, 'categories'])->middleware('role:admin,manager,finance,staff');
    Route::post('/material-categories', [InventoryController::class, 'storeCategory'])->middleware('role:admin,manager');
    Route::put('/material-categories/{materialCategory}', [InventoryController::class, 'updateCategory'])->middleware('role:admin,manager');
    Route::delete('/material-categories/{materialCategory}', [InventoryController::class, 'destroyCategory'])->middleware('role:admin,manager');
    Route::get('/materials', [InventoryController::class, 'materials'])->middleware('role:admin,manager,finance,staff');
    Route::post('/materials', [InventoryController::class, 'storeMaterial'])->middleware('role:admin,manager');
    Route::get('/materials/{material}', [InventoryController::class, 'showMaterial'])->middleware('role:admin,manager,finance,staff');
    Route::put('/materials/{material}', [InventoryController::class, 'updateMaterial'])->middleware('role:admin,manager');
    Route::delete('/materials/{material}', [InventoryController::class, 'destroyMaterial'])->middleware('role:admin,manager');
    Route::get('/inventory-movements', [InventoryController::class, 'movements'])->middleware('role:admin,manager,finance,staff');
    Route::post('/inventory-movements', [InventoryController::class, 'storeMovement'])->middleware('role:admin,manager,staff');
    Route::get('/inventory-movements/{inventoryMovement}', [InventoryController::class, 'showMovement'])->middleware('role:admin,manager,finance,staff');
    Route::post('/materials/{material}/stock-in', [InventoryController::class, 'stockIn'])->middleware('role:admin,manager,staff');
    Route::post('/materials/{material}/stock-out', [InventoryController::class, 'stockOut'])->middleware('role:admin,manager,staff');
    Route::post('/materials/{material}/adjust-stock', [InventoryController::class, 'adjustStock'])->middleware('role:admin,manager');
    Route::get('/purchase-orders', [InventoryController::class, 'purchaseOrders'])->middleware('role:admin,manager,finance,staff');
    Route::post('/purchase-orders', [InventoryController::class, 'storePurchaseOrder'])->middleware('role:admin,manager');
    Route::get('/purchase-orders/{purchaseOrder}', [InventoryController::class, 'showPurchaseOrder'])->middleware('role:admin,manager,finance,staff');
    Route::put('/purchase-orders/{purchaseOrder}', [InventoryController::class, 'updatePurchaseOrder'])->middleware('role:admin,manager');
    Route::delete('/purchase-orders/{purchaseOrder}', [InventoryController::class, 'destroyPurchaseOrder'])->middleware('role:admin,manager');
    Route::post('/purchase-orders/{purchaseOrder}/receive', [InventoryController::class, 'receivePurchaseOrder'])->middleware('role:admin,manager,staff');
    Route::post('/purchase-orders/{purchaseOrder}/cancel', [InventoryController::class, 'cancelPurchaseOrder'])->middleware('role:admin,manager');
    Route::get('/suppliers/{supplier}/balance', [InventoryController::class, 'supplierBalance'])->middleware('role:admin,manager,finance,staff');
    Route::get('/suppliers/{supplier}/materials', [InventoryController::class, 'supplierMaterials'])->middleware('role:admin,manager,finance,staff');
    Route::get('/suppliers/{supplier}/purchase-orders', [InventoryController::class, 'supplierPurchaseOrders'])->middleware('role:admin,manager,finance,staff');
    Route::get('/projects/{project}/materials-used', [InventoryController::class, 'projectMaterials'])->middleware('role:admin,manager,finance,staff');
    Route::get('/inventory/reports/stock-levels', [InventoryController::class, 'stockLevelsReport'])->middleware('role:admin,manager,finance');
    Route::get('/inventory/reports/low-stock', [InventoryController::class, 'lowStockReport'])->middleware('role:admin,manager,finance');
    Route::get('/inventory/reports/movements', [InventoryController::class, 'movementsReport'])->middleware('role:admin,manager,finance');
    Route::get('/inventory/reports/project-materials', [InventoryController::class, 'projectMaterialsReport'])->middleware('role:admin,manager,finance');
    Route::get('/inventory/reports/supplier-balance', [InventoryController::class, 'supplierBalanceReport'])->middleware('role:admin,manager,finance');
    Route::get('/hr/overview', [HrController::class, 'overview'])->middleware('role:admin,manager,hr');
    Route::get('/hr/attendance/weekly', [HrController::class, 'weeklyAttendance'])->middleware('role:admin,manager,hr');
    Route::get('/hr/attendance/monthly', [HrController::class, 'monthlyAttendance'])->middleware('role:admin,manager,hr');
    Route::get('/hr/attendance/analytics', [HrController::class, 'attendanceAnalytics'])->middleware('role:admin,manager,hr');
    Route::get('/hr/attendance/attempt-logs', [HrController::class, 'attemptLogs'])->middleware('role:admin,manager,hr');
    Route::get('/hr/attendance', [HrController::class, 'attendances'])->middleware('role:admin,manager,hr');
    Route::get('/hr/attendance/daily', [HrController::class, 'attendances'])->middleware('role:admin,manager,hr');
    Route::post('/hr/attendance/manual', [HrController::class, 'manualAttendance'])->middleware('role:admin,manager,hr');
    Route::put('/hr/attendance/{attendance}', [HrController::class, 'updateAttendance'])->middleware('role:admin,manager,hr');
    Route::delete('/hr/attendance/{attendance}', [HrController::class, 'destroyAttendance'])->middleware('role:admin,manager,hr');
    Route::get('/hr/office-locations', [HrController::class, 'officeLocations'])->middleware('role:admin,manager,hr');
    Route::post('/hr/office-locations', [HrController::class, 'storeOfficeLocation'])->middleware('role:admin,manager,hr');
    Route::put('/hr/office-locations/{officeLocation}', [HrController::class, 'updateOfficeLocation'])->middleware('role:admin,manager,hr');
    Route::get('/employees', [HrController::class, 'employees'])->middleware('role:admin,manager,hr,staff');
    Route::post('/employees', [HrController::class, 'storeEmployee'])->middleware('role:admin,manager,hr');
    Route::get('/employees/{employee}', [HrController::class, 'showEmployee'])->middleware('role:admin,manager,hr');
    Route::put('/employees/{employee}', [HrController::class, 'updateEmployee'])->middleware('role:admin,manager,hr');
    Route::post('/employees/{employee}/reset-password', [HrController::class, 'resetEmployeePassword'])->middleware('role:admin,manager,hr');
    Route::delete('/employees/{employee}', [HrController::class, 'destroyEmployee'])->middleware('role:admin,manager,hr');
    Route::post('/employees/{employee}/documents', [HrController::class, 'uploadEmployeeDocument'])->middleware('role:admin,manager,hr');
    Route::get('/employees/{employee}/documents/{employeeDocument}/download', [HrController::class, 'downloadEmployeeDocument'])->middleware('role:admin,manager,hr');
    Route::get('/departments', [HrController::class, 'departments'])->middleware('role:admin,manager,hr');
    Route::post('/departments', [HrController::class, 'storeDepartment'])->middleware('role:admin,manager,hr');
    Route::put('/departments/{department}', [HrController::class, 'updateDepartment'])->middleware('role:admin,manager,hr');
    Route::delete('/departments/{department}', [HrController::class, 'destroyDepartment'])->middleware('role:admin,manager,hr');
    Route::get('/attendances', [HrController::class, 'attendances'])->middleware('role:admin,manager,hr');
    Route::post('/attendances/check-in', [HrController::class, 'checkIn']);
    Route::post('/attendances/check-out', [HrController::class, 'checkOut']);
    Route::post('/attendances/manual', [HrController::class, 'manualAttendance'])->middleware('role:admin,manager,hr');
    Route::put('/attendances/{attendance}', [HrController::class, 'updateAttendance'])->middleware('role:admin,manager,hr');
    Route::delete('/attendances/{attendance}', [HrController::class, 'destroyAttendance'])->middleware('role:admin,manager,hr');
    Route::get('/leave-requests', [HrController::class, 'leaveRequests']);
    Route::post('/leave-requests', [HrController::class, 'storeLeaveRequest']);
    Route::post('/leave-requests/{leaveRequest}/approve', [HrController::class, 'approveLeave'])->middleware('role:admin,manager,hr');
    Route::post('/leave-requests/{leaveRequest}/reject', [HrController::class, 'rejectLeave'])->middleware('role:admin,manager,hr');
    Route::get('/leave-balances', [HrController::class, 'leaveBalances'])->middleware('role:admin,manager,hr');
    Route::get('/holidays', [HrController::class, 'holidays']);
    Route::post('/holidays', [HrController::class, 'storeHoliday'])->middleware('role:admin,manager,hr');
    Route::get('/payrolls', [HrController::class, 'payrolls'])->middleware('role:admin,manager,hr,finance');
    Route::get('/payrolls/export', [HrController::class, 'exportPayrolls'])->middleware('role:admin,manager,finance');
    Route::post('/payrolls/generate', [HrController::class, 'generatePayroll'])->middleware('role:admin,manager,hr,finance');
    Route::post('/payrolls/{payroll}/approve', [HrController::class, 'approvePayroll'])->middleware('role:admin,manager,finance');
    Route::put('/payrolls/{payroll}', [HrController::class, 'updatePayroll'])->middleware('role:admin,manager,finance');
    Route::patch('/payrolls/{payroll}', [HrController::class, 'updatePayroll'])->middleware('role:admin,manager,finance');
    Route::delete('/payrolls/{payroll}', [HrController::class, 'destroyPayroll'])->middleware('role:admin,manager,finance');
    Route::post('/payrolls/{payroll}/mark-paid', [HrController::class, 'markPayrollPaid'])->middleware('role:admin,manager,finance');
    Route::get('/payrolls/{payroll}/payslip', [HrController::class, 'payslip']);
    Route::get('/salary-histories', [HrController::class, 'salaryHistories'])->middleware('role:admin,manager,hr');
    Route::get('/performance-reviews', [HrController::class, 'performanceReviews'])->middleware('role:admin,manager,hr');
    Route::post('/performance-reviews', [HrController::class, 'storePerformanceReview'])->middleware('role:admin,manager,hr');
    Route::put('/performance-reviews/{performanceReview}', [HrController::class, 'updatePerformanceReview'])->middleware('role:admin,manager,hr');
    Route::get('/employee-goals', [HrController::class, 'employeeGoals']);
    Route::post('/employee-goals', [HrController::class, 'storeEmployeeGoal'])->middleware('role:admin,manager,hr');
    Route::get('/hr/reports/attendance', [HrController::class, 'attendanceReport'])->middleware('role:admin,manager,hr');
    Route::get('/hr/reports/leave', [HrController::class, 'leaveReport'])->middleware('role:admin,manager,hr');
    Route::get('/hr/reports/payroll', [HrController::class, 'payrollReport'])->middleware('role:admin,manager,hr,finance');
    Route::get('/reports/quotations', [QuotationController::class, 'report']);
    Route::get('/reports/{key}', [ReportsController::class, 'show'])->middleware('role:admin,manager,finance');
    Route::get('/reports/{key}/export', [ReportsController::class, 'export'])->middleware('role:admin,manager,finance');
    Route::apiResource('quotations', QuotationController::class);
    Route::post('/quotations/{quotation}/send', [QuotationController::class, 'send']);
    Route::post('/quotations/{quotation}/approve', [QuotationController::class, 'approve']);
    Route::post('/quotations/{quotation}/reject', [QuotationController::class, 'reject']);
    Route::post('/quotations/{quotation}/revise', [QuotationController::class, 'revise']);
    Route::get('/quotations/{quotation}/versions', [QuotationController::class, 'versions']);
    Route::post('/quotations/{quotation}/attachments', [QuotationController::class, 'attachment']);
    Route::post('/quotations/{quotation}/convert', [QuotationController::class, 'convert']);
    Route::post('/quotations/{quotation}/sections', [QuotationController::class, 'storeSection']);
    Route::post('/quotations/{quotation}/rooms', [QuotationController::class, 'storeRoom']);
    Route::post('/quotations/{quotation}/items', [QuotationController::class, 'storeItem']);
    Route::put('/quotation-items/{quotationItem}', [QuotationController::class, 'updateItem']);
    Route::delete('/quotation-items/{quotationItem}', [QuotationController::class, 'destroyItem']);
});
