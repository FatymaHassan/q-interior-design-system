<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Backup;
use App\Models\ClientMessage;
use App\Models\Department;
use App\Models\Document;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\EmployeeGoal;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ClientApproval;
use App\Models\Holiday;
use App\Models\InventoryMovement;
use App\Models\Invoice;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PerformanceReview;
use App\Models\Notification;
use App\Models\Overhead;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectStage;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Quotation;
use App\Models\Role;
use App\Models\SalaryHistory;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskStatusHistory;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminUser = User::firstOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);

        $permissions = collect([
            'view_dashboard' => 'View dashboard',
            'manage_users' => 'Manage users',
            'manage_roles' => 'Manage roles and permissions',
            'manage_clients' => 'Manage clients',
            'manage_projects' => 'Manage projects',
            'manage_documents' => 'Manage documents',
            'manage_notifications' => 'Manage notifications',
            'manage_quotations' => 'Manage quotations',
            'manage_hr' => 'Manage HR module',
            'manage_inventory' => 'Manage inventory and suppliers',
            'manage_settings' => 'Manage company settings',
        ])->map(fn ($label, $name) => Permission::firstOrCreate(['name' => $name], ['label' => $label]));

        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['label' => 'Administrator']);
        $managerRole = Role::firstOrCreate(['name' => 'manager'], ['label' => 'Project Manager']);
        $designerRole = Role::firstOrCreate(['name' => 'designer'], ['label' => 'Designer']);
        $hrRole = Role::firstOrCreate(['name' => 'hr'], ['label' => 'HR Staff']);
        $financeRole = Role::firstOrCreate(['name' => 'finance'], ['label' => 'Finance Staff']);
        $staffRole = Role::firstOrCreate(['name' => 'staff'], ['label' => 'Project Staff']);
        $viewerRole = Role::firstOrCreate(['name' => 'viewer'], ['label' => 'Viewer']);

        $adminRole->permissions()->sync($permissions->pluck('id'));
        $managerRole->permissions()->sync($permissions->whereIn('name', ['view_dashboard', 'manage_clients', 'manage_projects', 'manage_documents', 'manage_notifications', 'manage_quotations', 'manage_hr', 'manage_inventory'])->pluck('id'));
        $designerRole->permissions()->sync($permissions->whereIn('name', ['view_dashboard', 'manage_projects', 'manage_documents', 'manage_notifications', 'manage_quotations'])->pluck('id'));
        $hrRole->permissions()->sync($permissions->whereIn('name', ['view_dashboard', 'manage_hr', 'manage_notifications'])->pluck('id'));
        $financeRole->permissions()->sync($permissions->whereIn('name', ['view_dashboard', 'manage_notifications', 'manage_inventory'])->pluck('id'));
        $staffRole->permissions()->sync($permissions->whereIn('name', ['view_dashboard', 'manage_projects', 'manage_notifications', 'manage_inventory'])->pluck('id'));
        $viewerRole->permissions()->sync($permissions->where('name', 'view_dashboard')->pluck('id'));
        $adminUser->roles()->syncWithoutDetaching([$adminRole->id]);

        foreach ([
            ['name' => 'Inquiry', 'order' => 1, 'color' => '#f59e0b'],
            ['name' => 'Design', 'order' => 2, 'color' => '#3b82f6'],
            ['name' => 'Materials Order', 'order' => 3, 'color' => '#8b5cf6'],
            ['name' => 'Installation', 'order' => 4, 'color' => '#14b8a6'],
            ['name' => 'Completed', 'order' => 5, 'color' => '#22c55e'],
        ] as $stage) {
            ProjectStage::updateOrCreate(['name' => $stage['name']], $stage);
        }

        foreach ([
            ['key' => 'company_name', 'value' => 'Q Interior Design', 'type' => 'string'],
            ['key' => 'company_email', 'value' => 'info@qinterior.example', 'type' => 'string'],
            ['key' => 'company_phone', 'value' => '+252 61 0000000', 'type' => 'string'],
            ['key' => 'company_address', 'value' => 'Mogadishu, Somalia', 'type' => 'string'],
            ['key' => 'default_currency', 'value' => 'USD', 'type' => 'string'],
            ['key' => 'currency', 'value' => 'USD', 'type' => 'string'],
            ['key' => 'invoice_prefix', 'value' => 'INV-', 'type' => 'string'],
            ['key' => 'quotation_prefix', 'value' => 'QT-', 'type' => 'string'],
            ['key' => 'purchase_order_prefix', 'value' => 'PO-', 'type' => 'string'],
            ['key' => 'default_tax_rate', 'value' => '0', 'type' => 'number'],
            ['key' => 'expense_auto_approve_limit', 'value' => '500', 'type' => 'number'],
            ['key' => 'expense_approval_threshold', 'value' => '500', 'type' => 'number'],
            ['key' => 'hr_start_time', 'value' => '09:00', 'type' => 'string'],
            ['key' => 'working_hours_start', 'value' => '09:00', 'type' => 'string'],
            ['key' => 'working_hours_end', 'value' => '17:00', 'type' => 'string'],
            ['key' => 'backup_enabled', 'value' => 'true', 'type' => 'boolean'],
            ['key' => 'backup_type', 'value' => 'full', 'type' => 'string'],
            ['key' => 'backup_time', 'value' => '23:00', 'type' => 'string'],
            ['key' => 'notifications_enabled', 'value' => 'true', 'type' => 'boolean'],
            ['key' => 'daily_summary_enabled', 'value' => 'true', 'type' => 'boolean'],
        ] as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }

        foreach ([
            ['name' => 'Design', 'description' => 'Interior design and concept team'],
            ['name' => 'Operations', 'description' => 'Operations and project coordination'],
            ['name' => 'Finance', 'description' => 'Payments, payroll, and reporting'],
            ['name' => 'HR', 'description' => 'People operations'],
            ['name' => 'Site Team', 'description' => 'Site installation and supervision'],
            ['name' => 'Sales', 'description' => 'Client acquisition and follow-up'],
            ['name' => 'Management', 'description' => 'Leadership team'],
        ] as $department) {
            Department::firstOrCreate(['name' => $department['name']], $department + ['status' => 'Active']);
        }

        foreach ([
            ['name' => 'Design costs', 'type' => 'project_expense'],
            ['name' => 'Materials', 'type' => 'project_expense'],
            ['name' => 'Labor', 'type' => 'project_expense'],
            ['name' => 'Labour', 'type' => 'project_expense'],
            ['name' => 'Site expenses', 'type' => 'project_expense'],
            ['name' => 'Transport', 'type' => 'project_expense'],
            ['name' => 'Delivery', 'type' => 'project_expense'],
            ['name' => 'Design Fees', 'type' => 'project_expense'],
            ['name' => 'Fuel', 'type' => 'project_expense'],
            ['name' => 'Equipment Rental', 'type' => 'project_expense'],
            ['name' => 'Food for Workers', 'type' => 'project_expense'],
            ['name' => 'Other Project Cost', 'type' => 'project_expense'],
            ['name' => 'Office Rent', 'type' => 'overhead'],
            ['name' => 'Electricity', 'type' => 'overhead'],
            ['name' => 'Water', 'type' => 'overhead'],
            ['name' => 'Internet', 'type' => 'overhead'],
            ['name' => 'Cleaning', 'type' => 'overhead'],
            ['name' => 'Office Supplies', 'type' => 'overhead'],
            ['name' => 'Marketing', 'type' => 'overhead'],
            ['name' => 'Software Subscriptions', 'type' => 'overhead'],
            ['name' => 'Bank Charges', 'type' => 'overhead'],
            ['name' => 'Maintenance', 'type' => 'overhead'],
            ['name' => 'Taxes', 'type' => 'overhead'],
            ['name' => 'Other Operations', 'type' => 'overhead'],
            ['name' => 'Materials Purchase', 'type' => 'inventory'],
            ['name' => 'Tools', 'type' => 'inventory'],
            ['name' => 'Stock Adjustment', 'type' => 'inventory'],
            ['name' => 'Damaged Materials', 'type' => 'inventory'],
        ] as $category) {
            ExpenseCategory::firstOrCreate(['name' => $category['name']], $category + ['status' => 'Active', 'created_by' => $adminUser->id, 'updated_by' => $adminUser->id]);
        }

        foreach ([
            'Ceiling Materials',
            'Wall Decoration',
            'Paint',
            'Wood',
            'Lighting',
            'Furniture Accessories',
            'Tools',
            'Electrical',
            'Fabric',
            'Marble',
            'Gypsum',
            'Other',
        ] as $name) {
            MaterialCategory::firstOrCreate(
                ['name' => $name],
                ['description' => $name . ' inventory category.', 'status' => 'Active']
            );
        }

        $amina = Client::firstOrCreate(
            ['email' => 'amina@example.com'],
            ['name' => 'Amina Hassan', 'phone' => '+252 61 0000004', 'location' => 'Mogadishu', 'portal_password' => Hash::make('password'), 'notes' => 'Living room makeover client.']
        );
        $amina->update(['portal_password' => $amina->portal_password ?: Hash::make('password')]);

        $qaran = Client::firstOrCreate(
            ['email' => 'office@qaran.example'],
            ['name' => 'Qaran Group', 'phone' => '+252 61 0000005', 'location' => 'Hodan', 'portal_password' => Hash::make('password'), 'notes' => 'Corporate office redesign.']
        );
        $qaran->update(['portal_password' => $qaran->portal_password ?: Hash::make('password')]);

        $hani = Client::firstOrCreate(
            ['email' => 'hani@example.com'],
            ['name' => 'Hani Ali', 'phone' => '+252 61 0000006', 'location' => 'Taleex', 'portal_password' => Hash::make('password'), 'notes' => 'Luxury bedroom design client.']
        );
        $hani->update(['portal_password' => $hani->portal_password ?: Hash::make('password')]);

        $projects = [
            ['client_id' => $amina->id, 'project_stage_id' => ProjectStage::where('name', 'Installation')->value('id'), 'project_name' => 'Villa Living Room Makeover', 'location' => 'Mogadishu', 'start_date' => '2026-06-01', 'end_date' => '2026-06-22', 'deadline' => '2026-06-22', 'budget' => 4500, 'actual_cost' => 2870, 'progress' => 68, 'status' => 'In Progress'],
            ['client_id' => $qaran->id, 'project_stage_id' => ProjectStage::where('name', 'Materials Order')->value('id'), 'project_name' => 'Modern Office Interior', 'location' => 'Hodan', 'start_date' => '2026-05-20', 'end_date' => '2026-06-18', 'deadline' => '2026-06-18', 'budget' => 7600, 'actual_cost' => 6200, 'progress' => 82, 'status' => 'In Progress'],
            ['client_id' => $hani->id, 'project_stage_id' => ProjectStage::where('name', 'Design')->value('id'), 'project_name' => 'Luxury Bedroom Design', 'location' => 'Taleex', 'start_date' => '2026-06-03', 'end_date' => '2026-06-15', 'deadline' => '2026-06-15', 'budget' => 2200, 'actual_cost' => 2100, 'progress' => 90, 'status' => 'Delayed'],
        ];

        foreach ($projects as $project) {
            Project::firstOrCreate(['project_name' => $project['project_name']], $project);
        }

        $suppliers = [
            ['name' => 'Mogadishu Furniture House', 'category' => 'Furniture', 'phone' => '+252 61 0000001', 'total_orders' => 8, 'paid_amount' => 3200, 'balance' => 700, 'status' => 'Pending Delivery'],
            ['name' => 'Golden Lights Supplier', 'category' => 'Lighting', 'phone' => '+252 61 0000002', 'total_orders' => 5, 'paid_amount' => 1400, 'balance' => 0, 'status' => 'Delivered'],
            ['name' => 'Som Paint & Decor', 'category' => 'Paint', 'phone' => '+252 61 0000003', 'total_orders' => 11, 'paid_amount' => 980, 'balance' => 230, 'status' => 'Partial'],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::firstOrCreate(['name' => $supplier['name']], $supplier);
        }

        $villa = Project::where('project_name', 'Villa Living Room Makeover')->first();
        $office = Project::where('project_name', 'Modern Office Interior')->first();
        $bedroom = Project::where('project_name', 'Luxury Bedroom Design')->first();
        $furniture = Supplier::where('name', 'Mogadishu Furniture House')->first();
        $lighting = Supplier::where('name', 'Golden Lights Supplier')->first();

        Material::firstOrCreate(
            ['code' => 'GYB-001'],
            [
                'name' => 'Gypsum Board',
                'material_category_id' => MaterialCategory::where('name', 'Gypsum')->value('id'),
                'supplier_id' => $furniture->id,
                'unit' => 'Piece',
                'purchase_price' => 8,
                'selling_price' => 12,
                'current_stock' => 35,
                'minimum_stock' => 10,
                'storage_location' => 'Main Store',
                'status' => 'Active',
            ]
        );

        Material::firstOrCreate(
            ['code' => 'LED-STRIP'],
            [
                'name' => 'LED Strip',
                'material_category_id' => MaterialCategory::where('name', 'Lighting')->value('id'),
                'supplier_id' => $lighting->id,
                'unit' => 'Meter',
                'purchase_price' => 3,
                'selling_price' => 5,
                'current_stock' => 8,
                'minimum_stock' => 10,
                'storage_location' => 'Lighting Shelf',
                'status' => 'Active',
            ]
        );

        Expense::firstOrCreate(
            ['title' => 'Living room sofa set'],
            ['project_id' => $villa->id, 'supplier_id' => $furniture->id, 'category' => 'Furniture', 'quantity' => 1, 'unit_price' => 1800, 'amount' => 1800, 'expense_date' => '2026-06-05']
        );

        Expense::firstOrCreate(
            ['title' => 'Office lighting package'],
            ['project_id' => $office->id, 'supplier_id' => $lighting->id, 'category' => 'Lighting', 'quantity' => 1, 'unit_price' => 1400, 'amount' => 1400, 'expense_date' => '2026-06-08']
        );

        Payment::firstOrCreate(
            ['notes' => 'Initial client payment'],
            ['project_id' => $villa->id, 'client_id' => $amina->id, 'type' => 'client', 'amount' => 2500, 'payment_date' => '2026-06-04', 'method' => 'bank', 'status' => 'paid']
        );

        Notification::firstOrCreate(
            ['title' => 'Project deadline'],
            ['message' => 'Luxury Bedroom Design is due soon.', 'type' => 'warning', 'is_read' => false]
        );

        Notification::firstOrCreate(
            ['title' => 'Supplier balance'],
            ['message' => 'Mogadishu Furniture House has an unpaid balance.', 'type' => 'finance', 'is_read' => false]
        );

        Notification::firstOrCreate(
            ['title' => 'Customer update'],
            ['message' => 'Amina requested progress photos.', 'type' => 'message', 'is_read' => true]
        );

        Overhead::firstOrCreate(
            ['title' => 'Studio rent'],
            ['category' => 'Rent', 'amount' => 650, 'overhead_date' => '2026-06-01', 'payment_method' => 'bank', 'notes' => 'Monthly operating overhead.']
        );

        Overhead::firstOrCreate(
            ['title' => 'Transport and site visits'],
            ['category' => 'Transport', 'amount' => 180, 'overhead_date' => '2026-06-07', 'payment_method' => 'cash', 'notes' => 'Project supervision travel.']
        );

        Task::firstOrCreate(
            ['title' => 'Install curtain track and final lighting check'],
            ['project_id' => $villa->id, 'assigned_to' => $adminUser->id, 'assigned_by' => $adminUser->id, 'priority' => 'High', 'status' => 'In Progress', 'deadline' => now()->addDay()->toDateString(), 'notes' => 'Upload completion photos after site visit.']
        );

        Task::firstOrCreate(
            ['title' => 'Confirm office desk material delivery'],
            ['project_id' => $office->id, 'assigned_to' => $adminUser->id, 'assigned_by' => $adminUser->id, 'priority' => 'Medium', 'status' => 'Pending', 'deadline' => now()->addDays(2)->toDateString()]
        );

        ClientApproval::firstOrCreate(
            ['project_id' => $villa->id, 'title' => 'Living room final color palette'],
            ['client_id' => $amina->id, 'description' => 'Approve the final warm neutral palette before final accessories are purchased.', 'approval_type' => 'design', 'status' => 'Pending']
        );

        $employee = Employee::firstOrCreate(
            ['email' => 'hr.employee@example.com'],
            [
                'user_id' => $adminUser->id,
                'department_id' => Department::where('name', 'Design')->value('id'),
                'name' => 'Nimco Designer',
                'position' => 'Interior Designer',
                'specialty' => 'Moodboards and residential interiors',
                'daily_rate' => 55,
                'phone' => '+252 61 0000010',
                'address' => 'Mogadishu',
                'employment_start_date' => '2026-01-15',
                'contract_type' => 'Full Time',
                'salary_grade' => 'G2',
                'monthly_salary' => 1200,
                'emergency_contact_name' => 'Ayan',
                'emergency_contact_phone' => '+252 61 0000011',
                'status' => 'Active',
                'notes' => 'Seed employee for HR module.',
                'created_by' => $adminUser->id,
                'updated_by' => $adminUser->id,
            ]
        );

        foreach ([
            ['leave_type' => 'Annual Leave', 'total_allowed_days' => 21],
            ['leave_type' => 'Sick Leave', 'total_allowed_days' => 10],
        ] as $balance) {
            LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'year' => now()->year, 'leave_type' => $balance['leave_type']],
                ['total_allowed_days' => $balance['total_allowed_days'], 'used_days' => 0, 'remaining_days' => $balance['total_allowed_days']]
            );
        }

        $attendance = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', now()->toDateString())
            ->first();
        ($attendance ?: new Attendance(['employee_id' => $employee->id, 'date' => now()->toDateString()]))
            ->fill(['check_in' => '08:55:00', 'check_out' => null, 'total_hours' => 0, 'status' => 'Present', 'method' => 'Manual', 'created_by' => $adminUser->id])
            ->save();

        Holiday::firstOrCreate(
            ['name' => 'Eid Holiday', 'date' => now()->addDays(12)->toDateString()],
            ['type' => 'Religious Holiday', 'description' => 'Company holiday.']
        );

        Payroll::firstOrCreate(
            ['employee_id' => $employee->id, 'month' => now()->month, 'year' => now()->year],
            ['base_salary' => 1200, 'total_working_days' => 1, 'present_days' => 1, 'bonus' => 100, 'deduction' => 0, 'net_salary' => 1300, 'approval_status' => 'Prepared', 'payment_status' => 'Unpaid', 'prepared_by' => $adminUser->id]
        );

        PerformanceReview::firstOrCreate(
            ['employee_id' => $employee->id, 'review_period' => 'Q2 2026'],
            ['reviewer_id' => $adminUser->id, 'review_date' => now()->addDays(7)->toDateString(), 'goals_score' => 4, 'quality_score' => 4, 'teamwork_score' => 5, 'punctuality_score' => 4, 'communication_score' => 4, 'overall_rating' => 4.2, 'manager_comments' => 'Strong design ownership.', 'status' => 'Reviewed']
        );

        EmployeeGoal::firstOrCreate(
            ['employee_id' => $employee->id, 'title' => 'Improve client moodboard turnaround'],
            ['description' => 'Deliver first moodboard draft within three working days.', 'target_date' => now()->addMonth()->toDateString(), 'status' => 'In Progress', 'progress' => 45, 'manager_comment' => 'Good progress.']
        );

        $quotation = Quotation::firstOrCreate(
            ['quotation_number' => 'QTN-2026-0001'],
            [
                'client_id' => $amina->id,
                'project_id' => $villa->id,
                'title' => 'Villa Living Room Makeover Quotation',
                'project_type' => 'Residential interior',
                'quotation_date' => now()->toDateString(),
                'valid_until' => now()->addDays(14)->toDateString(),
                'payment_terms' => '50% deposit before procurement, 50% after installation.',
                'deposit_percentage' => 50,
                'notes' => 'Includes design coordination, selected furniture, lighting, and accessories.',
                'special_conditions' => 'Material prices are valid during the quotation validity period.',
                'scope_exclusions' => 'Civil works and electrical rewiring are excluded unless listed as separate items.',
                'status' => 'Sent',
                'sent_at' => now(),
                'created_by' => $adminUser->id,
                'updated_by' => $adminUser->id,
            ]
        );

        if ($quotation->items()->count() === 0) {
            foreach ([
                ['description' => 'Concept design, moodboard, and styling plan', 'quantity' => 1, 'unit_price' => 650, 'discount' => 0, 'tax' => 0],
                ['description' => 'Furniture and accessory procurement package', 'quantity' => 1, 'unit_price' => 2800, 'discount' => 100, 'tax' => 0],
                ['description' => 'Installation supervision and final styling', 'quantity' => 1, 'unit_price' => 750, 'discount' => 0, 'tax' => 0],
            ] as $item) {
                $quotation->items()->create($item + ['total' => max(($item['quantity'] * $item['unit_price']) - $item['discount'] + $item['tax'], 0)]);
            }
            $quotation->update([
                'subtotal' => 4200,
                'discount' => 100,
                'tax' => 0,
                'total_amount' => 4100,
            ]);
            $quotation->versions()->create([
                'version_number' => 1,
                'subtotal' => 4200,
                'discount' => 100,
                'tax' => 0,
                'total_amount' => 4100,
                'change_notes' => 'Seed quotation',
                'status' => 'Sent',
                'created_by' => $adminUser->id,
            ]);
            $quotation->approvals()->firstOrCreate(['client_id' => $amina->id], ['status' => 'Pending']);
        }

        $this->seedPresentationDemoData($adminUser, [
            'amina' => $amina,
            'qaran' => $qaran,
            'hani' => $hani,
        ], [
            'villa' => $villa,
            'office' => $office,
            'bedroom' => $bedroom,
        ], [
            'furniture' => $furniture,
            'lighting' => $lighting,
            'paint' => Supplier::where('name', 'Som Paint & Decor')->first(),
        ], $quotation);
    }

    private function seedPresentationDemoData(User $adminUser, array $clients, array $projects, array $suppliers, Quotation $villaQuotation): void
    {
        Storage::disk('public')->put('demo/client-portal/villa-progress.svg', $this->demoSvg('Villa Progress', '#0f766e', '#f6d365'));
        Storage::disk('public')->put('demo/client-portal/office-board.svg', $this->demoSvg('Office Board', '#1d4ed8', '#93c5fd'));
        Storage::disk('public')->put('demo/documents/villa-contract.txt', "Q Interior Design\nVilla Living Room Makeover contract summary\nDeposit: 50%\nDelivery: June 2026\n");
        Storage::disk('public')->put('demo/documents/office-materials.txt', "Q Interior Design\nModern Office Interior material schedule\nGypsum, LED lighting, desks, paint and accessories.\n");
        Storage::disk('public')->put('demo/hr/nimco-contract.txt', "Employee contract sample for presentation demo.\n");

        $manager = User::firstOrCreate(['email' => 'manager@qinterior.example'], ['name' => 'Ayaan Project Manager', 'password' => Hash::make('password'), 'role' => 'manager']);
        $designer = User::firstOrCreate(['email' => 'designer@qinterior.example'], ['name' => 'Nimco Designer', 'password' => Hash::make('password'), 'role' => 'designer']);
        $finance = User::firstOrCreate(['email' => 'finance@qinterior.example'], ['name' => 'Khadar Finance', 'password' => Hash::make('password'), 'role' => 'finance']);

        foreach ([[$manager, 'manager'], [$designer, 'designer'], [$finance, 'finance']] as [$user, $roleName]) {
            if ($role = Role::where('name', $roleName)->first()) {
                $user->roles()->syncWithoutDetaching([$role->id]);
            }
        }

        $opsEmployee = Employee::firstOrCreate(
            ['email' => 'ayaan.manager@example.com'],
            [
                'user_id' => $manager->id,
                'department_id' => Department::where('name', 'Operations')->value('id'),
                'name' => 'Ayaan Mohamed',
                'position' => 'Project Manager',
                'daily_rate' => 75,
                'phone' => '+252 61 0000020',
                'address' => 'Mogadishu',
                'employment_start_date' => '2025-11-01',
                'contract_type' => 'Full Time',
                'salary_grade' => 'G3',
                'monthly_salary' => 1550,
                'emergency_contact_name' => 'Hodan Mohamed',
                'emergency_contact_phone' => '+252 61 0000021',
                'status' => 'Active',
                'created_by' => $adminUser->id,
                'updated_by' => $adminUser->id,
            ]
        );

        $siteEmployee = Employee::firstOrCreate(
            ['email' => 'site.lead@example.com'],
            [
                'department_id' => Department::where('name', 'Site Team')->value('id'),
                'name' => 'Yusuf Site Lead',
                'position' => 'Installation Supervisor',
                'daily_rate' => 45,
                'phone' => '+252 61 0000022',
                'address' => 'Hodan',
                'employment_start_date' => '2026-02-10',
                'contract_type' => 'Contract',
                'salary_grade' => 'G2',
                'monthly_salary' => 980,
                'emergency_contact_name' => 'Sagal',
                'emergency_contact_phone' => '+252 61 0000023',
                'status' => 'Active',
                'created_by' => $adminUser->id,
                'updated_by' => $adminUser->id,
            ]
        );

        $designerEmployee = Employee::where('email', 'hr.employee@example.com')->first();
        foreach ([$designerEmployee, $opsEmployee, $siteEmployee] as $employee) {
            if (! $employee) {
                continue;
            }

            foreach ([
                ['date' => now()->subDays(2)->toDateString(), 'check_in' => '08:58:00', 'check_out' => '17:08:00', 'total_hours' => 8.17, 'status' => 'Present'],
                ['date' => now()->subDay()->toDateString(), 'check_in' => '09:18:00', 'check_out' => '17:02:00', 'total_hours' => 7.73, 'status' => 'Late'],
                ['date' => now()->toDateString(), 'check_in' => '08:52:00', 'check_out' => null, 'total_hours' => 0, 'status' => 'Present'],
            ] as $attendance) {
                Attendance::updateOrCreate(
                    ['employee_id' => $employee->id, 'date' => $attendance['date']],
                    $attendance + ['method' => 'Manual', 'created_by' => $adminUser->id]
                );
            }

            foreach ([['Annual Leave', 21, 3], ['Sick Leave', 10, 1]] as [$type, $allowed, $used]) {
                LeaveBalance::updateOrCreate(
                    ['employee_id' => $employee->id, 'year' => now()->year, 'leave_type' => $type],
                    ['total_allowed_days' => $allowed, 'used_days' => $used, 'remaining_days' => $allowed - $used]
                );
            }
        }

        LeaveRequest::firstOrCreate(
            ['employee_id' => $opsEmployee->id, 'start_date' => now()->addDays(8)->toDateString(), 'leave_type' => 'Annual Leave'],
            ['end_date' => now()->addDays(10)->toDateString(), 'total_days' => 3, 'reason' => 'Family travel after project handover.', 'status' => 'Pending']
        );

        LeaveRequest::firstOrCreate(
            ['employee_id' => $siteEmployee->id, 'start_date' => now()->subDays(6)->toDateString(), 'leave_type' => 'Sick Leave'],
            ['end_date' => now()->subDays(5)->toDateString(), 'total_days' => 2, 'reason' => 'Medical appointment.', 'status' => 'Approved', 'approved_by' => $adminUser->id, 'approved_at' => now()->subDays(5)]
        );

        foreach ([['Somalia Independence Week', now()->addDays(5)->toDateString(), 'Company Holiday'], ['Team Planning Day', now()->addDays(18)->toDateString(), 'Company Event']] as [$name, $date, $type]) {
            Holiday::firstOrCreate(['name' => $name, 'date' => $date], ['type' => $type, 'description' => 'Seeded for HR calendar presentation.']);
        }

        EmployeeDocument::firstOrCreate(
            ['employee_id' => $designerEmployee?->id, 'title' => 'Signed employment contract'],
            ['document_type' => 'Contract', 'file_path' => 'demo/hr/nimco-contract.txt', 'file_type' => 'text/plain', 'uploaded_by' => $adminUser->id]
        );

        SalaryHistory::firstOrCreate(
            ['employee_id' => $opsEmployee->id, 'effective_date' => '2026-06-01'],
            ['old_salary' => 1450, 'new_salary' => 1550, 'reason' => 'Promotion to project manager grade.', 'changed_by' => $adminUser->id]
        );

        foreach ([[$opsEmployee, 1550, 125, 25, 'Approved', 'Unpaid'], [$siteEmployee, 980, 80, 0, 'Prepared', 'Unpaid']] as [$employee, $base, $bonus, $deduction, $approval, $payment]) {
            $payroll = Payroll::updateOrCreate(
                ['employee_id' => $employee->id, 'month' => now()->month, 'year' => now()->year],
                [
                    'base_salary' => $base,
                    'total_working_days' => 22,
                    'present_days' => 19,
                    'leave_days' => 1,
                    'absent_days' => 0,
                    'late_days' => 2,
                    'overtime_amount' => 60,
                    'bonus' => $bonus,
                    'deduction' => $deduction,
                    'net_salary' => $base + 60 + $bonus - $deduction,
                    'approval_status' => $approval,
                    'payment_status' => $payment,
                    'prepared_by' => $adminUser->id,
                    'approved_by' => $approval === 'Approved' ? $adminUser->id : null,
                ]
            );

            PayrollItem::firstOrCreate(['payroll_id' => $payroll->id, 'description' => 'Project overtime'], ['type' => 'Overtime', 'amount' => 60]);
            PayrollItem::firstOrCreate(['payroll_id' => $payroll->id, 'description' => 'Performance bonus'], ['type' => 'Bonus', 'amount' => $bonus]);
        }

        foreach ($projects as $project) {
            if (! $project) {
                continue;
            }

            ProjectMember::firstOrCreate(['project_id' => $project->id, 'employee_id' => $opsEmployee->id], ['user_id' => $manager->id, 'role' => 'Manager', 'role_on_project' => 'Project Lead', 'assigned_at' => now()->subDays(14), 'assigned_date' => now()->subDays(14)->toDateString()]);
            ProjectMember::firstOrCreate(['project_id' => $project->id, 'employee_id' => $designerEmployee?->id], ['user_id' => $designer->id, 'role' => 'Designer', 'role_on_project' => 'Design Owner', 'assigned_at' => now()->subDays(12), 'assigned_date' => now()->subDays(12)->toDateString()]);
        }

        $this->seedProjectPresentationFlow($adminUser, $clients, $projects, $suppliers, $villaQuotation);
        $this->seedOperationsEvidence($adminUser);
    }

    private function seedProjectPresentationFlow(User $adminUser, array $clients, array $projects, array $suppliers, Quotation $villaQuotation): void
    {
        $villa = $projects['villa'];
        $office = $projects['office'];
        $bedroom = $projects['bedroom'];
        $amina = $clients['amina'];
        $qaran = $clients['qaran'];

        foreach ([
            [$villa, 'Progress photo - living room lighting', 'demo/client-portal/villa-progress.svg', 'image/svg+xml', 'photo', 'client'],
            [$villa, 'Signed project contract', 'demo/documents/villa-contract.txt', 'text/plain', 'contract', 'client'],
            [$office, 'Office materials schedule', 'demo/documents/office-materials.txt', 'text/plain', 'materials', 'client'],
            [$office, 'Concept board preview', 'demo/client-portal/office-board.svg', 'image/svg+xml', 'photo', 'client'],
            [$bedroom, 'Internal measurement notes', 'demo/documents/office-materials.txt', 'text/plain', 'site-notes', 'internal'],
        ] as [$project, $title, $path, $type, $category, $visibility]) {
            Document::firstOrCreate(
                ['project_id' => $project->id, 'title' => $title],
                ['file_path' => $path, 'file_type' => $type, 'document_category' => $category, 'visibility' => $visibility, 'uploaded_by' => $adminUser->id]
            );
        }

        foreach ([
            [$villa, $amina, 'staff', 'We uploaded today progress photo and the final color palette approval is ready.', true],
            [$villa, $amina, 'client', 'Thank you, please keep the warm lighting direction and send the final quote PDF.', false],
            [$office, $qaran, 'staff', 'The materials order is placed and supplier delivery is expected this week.', true],
        ] as [$project, $client, $sender, $message, $read]) {
            ClientMessage::firstOrCreate(
                ['project_id' => $project->id, 'message' => $message],
                ['client_id' => $client->id, 'user_id' => $sender === 'staff' ? $adminUser->id : null, 'sender_type' => $sender, 'is_read' => $read]
            );
        }

        ClientApproval::firstOrCreate(
            ['project_id' => $office->id, 'title' => 'Office reception concept board'],
            ['client_id' => $qaran->id, 'description' => 'Approve the reception concept before production starts.', 'approval_type' => 'concept', 'status' => 'Approved', 'client_comment' => 'Approved for production.', 'approved_at' => now()->subDays(2)]
        );

        ClientApproval::firstOrCreate(
            ['project_id' => $bedroom->id, 'title' => 'Bedroom headboard fabric'],
            ['client_id' => $clients['hani']->id, 'description' => 'Client requested a softer fabric option before approval.', 'approval_type' => 'material', 'status' => 'Revision Requested', 'client_comment' => 'Please send one lighter option.']
        );

        $officeQuotation = Quotation::firstOrCreate(
            ['quotation_number' => 'QTN-2026-0002'],
            [
                'client_id' => $qaran->id,
                'project_id' => $office->id,
                'title' => 'Modern Office Interior Quotation',
                'project_type' => 'Corporate office',
                'quotation_date' => now()->subDays(5)->toDateString(),
                'valid_until' => now()->addDays(9)->toDateString(),
                'subtotal' => 7600,
                'discount' => 250,
                'tax' => 0,
                'total_amount' => 7350,
                'payment_terms' => '40% deposit, 40% on material delivery, 20% after handover.',
                'deposit_percentage' => 40,
                'notes' => 'Includes reception, workstations, feature wall, lighting, and installation.',
                'status' => 'Approved',
                'sent_at' => now()->subDays(4),
                'approved_at' => now()->subDay(),
                'locked_at' => now()->subDay(),
                'created_by' => $adminUser->id,
                'updated_by' => $adminUser->id,
            ]
        );
        foreach ([['Reception feature wall', 1, 2100], ['Lighting and electrical fixtures', 1, 1850], ['Workstation styling package', 1, 3650]] as [$description, $quantity, $price]) {
            $officeQuotation->items()->firstOrCreate(['description' => $description], ['quantity' => $quantity, 'unit_price' => $price, 'total' => $quantity * $price]);
        }
        $officeQuotation->approvals()->firstOrCreate(['client_id' => $qaran->id], ['status' => 'Approved', 'signed_name' => 'Qaran Group', 'signed_at' => now()->subDay(), 'approved_at' => now()->subDay()]);

        foreach ([[$villaQuotation, 'INV-2026-0001', $amina, $villa, 'Partially Paid', 4100], [$officeQuotation, 'INV-2026-0002', $qaran, $office, 'Unpaid', 7350]] as [$quotation, $number, $client, $project, $status, $total]) {
            $invoice = Invoice::firstOrCreate(
                ['invoice_number' => $number],
                ['client_id' => $client->id, 'project_id' => $project->id, 'quotation_id' => $quotation->id, 'invoice_date' => now()->subDays(3)->toDateString(), 'due_date' => now()->addDays(7)->toDateString(), 'subtotal' => $total, 'discount' => 0, 'tax' => 0, 'total_amount' => $total, 'status' => $status, 'notes' => 'Seeded presentation invoice.', 'created_by' => $adminUser->id]
            );
            foreach ([['Design fees', 1, round($total * 0.25, 2)], ['Materials', 1, round($total * 0.55, 2)], ['Installation', 1, round($total * 0.20, 2)]] as [$description, $qty, $price]) {
                $invoice->items()->firstOrCreate(['description' => $description], ['quantity' => $qty, 'unit_price' => $price, 'total' => $qty * $price]);
            }
        }

        Payment::firstOrCreate(
            ['notes' => 'Second installment for villa project'],
            ['project_id' => $villa->id, 'client_id' => $amina->id, 'type' => 'client', 'amount' => 1200, 'payment_date' => now()->subDay()->toDateString(), 'method' => 'cash', 'status' => 'paid']
        );

        Expense::firstOrCreate(
            ['title' => 'Villa site labor day 1'],
            ['project_id' => $villa->id, 'supplier_id' => null, 'category' => 'Labor', 'quantity' => 4, 'unit_price' => 35, 'amount' => 140, 'expense_date' => now()->subDays(2)->toDateString(), 'notes' => 'Installation crew.']
        );

        Expense::firstOrCreate(
            ['title' => 'Office wall paint and primer'],
            ['project_id' => $office->id, 'supplier_id' => $suppliers['paint']?->id, 'category' => 'Materials', 'quantity' => 12, 'unit_price' => 18, 'amount' => 216, 'expense_date' => now()->subDays(3)->toDateString(), 'notes' => 'Linked to office materials order.']
        );

        $gypsum = Material::where('code', 'GYB-001')->first();
        $led = Material::where('code', 'LED-STRIP')->first();
        $po = PurchaseOrder::firstOrCreate(
            ['order_number' => 'PO-2026-0001'],
            ['supplier_id' => $suppliers['lighting']->id, 'order_date' => now()->subDays(4)->toDateString(), 'expected_delivery_date' => now()->addDays(2)->toDateString(), 'status' => 'Partially Received', 'subtotal' => 450, 'discount' => 0, 'tax' => 0, 'total_amount' => 450, 'notes' => 'LED strips and ceiling lighting for office and villa projects.', 'created_by' => $adminUser->id, 'approved_by' => $adminUser->id]
        );
        PurchaseOrderItem::firstOrCreate(['purchase_order_id' => $po->id, 'material_id' => $led->id], ['quantity_ordered' => 90, 'quantity_received' => 40, 'unit_price' => 5, 'total' => 450]);

        foreach ([[$gypsum, $villa, null, 'Stock Out', 8, 8, 'Used for villa ceiling detail'], [$led, $office, $po, 'Stock In', 40, 3, 'Partial supplier delivery'], [$led, $villa, null, 'Stock Out', 12, 3, 'Living room lighting installation']] as [$material, $project, $purchaseOrder, $type, $qty, $cost, $reason]) {
            InventoryMovement::firstOrCreate(
                ['material_id' => $material->id, 'movement_type' => $type, 'reason' => $reason],
                ['project_id' => $project->id, 'supplier_id' => $type === 'Stock In' ? $material->supplier_id : null, 'purchase_order_id' => $purchaseOrder?->id, 'quantity' => $qty, 'unit_cost' => $cost, 'total_cost' => $qty * $cost, 'movement_date' => now()->subDays(2)->toDateString(), 'created_by' => $adminUser->id]
            );
        }

        $task = Task::firstOrCreate(
            ['project_id' => $villa->id, 'title' => 'Upload before and after photos for client portal'],
            ['assigned_to' => $adminUser->id, 'assigned_by' => $adminUser->id, 'priority' => 'High', 'status' => 'Done', 'deadline' => now()->toDateString(), 'completed_at' => now(), 'notes' => 'Presentation flow task.']
        );
        TaskComment::firstOrCreate(['task_id' => $task->id, 'comment' => 'Photos uploaded and made visible to the client portal.'], ['user_id' => $adminUser->id]);
        TaskStatusHistory::firstOrCreate(['task_id' => $task->id, 'new_status' => 'Done'], ['old_status' => 'In Progress', 'changed_by' => $adminUser->id, 'note' => 'Completed for presentation demo.']);

        foreach ([
            ['title' => 'Overdue invoice reminder', 'message' => 'Office invoice is due in 7 days.', 'type' => 'invoice_reminder', 'priority' => 'high', 'module' => 'finance', 'link' => '/finance/invoices'],
            ['title' => 'Low stock alert', 'message' => 'LED Strip stock is below minimum level.', 'type' => 'low_stock', 'priority' => 'high', 'module' => 'inventory', 'link' => '/inventory'],
            ['title' => 'Client approval pending', 'message' => 'Villa Living Room color palette needs client approval.', 'type' => 'client_approval', 'priority' => 'normal', 'module' => 'projects', 'link' => '/client-approvals'],
        ] as $notification) {
            Notification::firstOrCreate(['title' => $notification['title']], $notification + ['project_id' => $notification['module'] === 'projects' ? $villa->id : null, 'is_read' => false]);
        }
    }

    private function seedOperationsEvidence(User $adminUser): void
    {
        Backup::firstOrCreate(
            ['file_path' => 'backups/q-interior-presentation-demo.zip'],
            ['backup_type' => 'full', 'file_size' => 1843200, 'status' => 'completed', 'created_by' => $adminUser->id]
        );

        AuditLog::firstOrCreate(
            ['action' => 'seeded_presentation_demo', 'module' => 'system'],
            ['user_id' => $adminUser->id, 'record_type' => 'database', 'record_id' => null, 'old_values' => null, 'new_values' => ['mode' => 'presentation'], 'ip_address' => '127.0.0.1', 'user_agent' => 'DatabaseSeeder', 'created_at' => now()]
        );
    }

    private function demoSvg(string $title, string $primary, string $accent): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="' . $primary . '"/><stop offset="1" stop-color="' . $accent . '"/></linearGradient></defs><rect width="1200" height="760" rx="40" fill="url(#g)"/><rect x="86" y="88" width="1028" height="584" rx="34" fill="rgba(255,255,255,.88)"/><rect x="142" y="152" width="430" height="360" rx="24" fill="' . $primary . '" opacity=".16"/><rect x="628" y="152" width="330" height="70" rx="18" fill="' . $primary . '" opacity=".2"/><rect x="628" y="252" width="430" height="44" rx="14" fill="' . $primary . '" opacity=".14"/><rect x="628" y="326" width="384" height="44" rx="14" fill="' . $primary . '" opacity=".14"/><rect x="628" y="400" width="282" height="44" rx="14" fill="' . $primary . '" opacity=".14"/><circle cx="358" cy="332" r="112" fill="' . $accent . '" opacity=".72"/><text x="142" y="596" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#111827">' . htmlspecialchars($title, ENT_QUOTES) . '</text><text x="142" y="638" font-family="Arial, sans-serif" font-size="24" fill="#4b5563">Q Interior Design presentation asset</text></svg>';
    }
}
