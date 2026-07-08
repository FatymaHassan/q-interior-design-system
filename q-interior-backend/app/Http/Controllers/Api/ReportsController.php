<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Document;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\InventoryMovement;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Material;
use App\Models\Payment;
use App\Models\Payroll;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\Supplier;
use App\Models\Task;
use App\Services\DashboardSummaryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    public function index()
    {
        return [
            'groups' => [
                'Finance Reports' => [
                    ['key' => 'profit-loss', 'title' => 'Profit & Loss Report'],
                    ['key' => 'cash-flow', 'title' => 'Cash Flow Report'],
                    ['key' => 'revenue-by-project', 'title' => 'Revenue by Project'],
                    ['key' => 'revenue-by-client', 'title' => 'Revenue by Client'],
                    ['key' => 'expense-by-category', 'title' => 'Expense by Category'],
                    ['key' => 'outstanding-invoices', 'title' => 'Outstanding Invoices'],
                    ['key' => 'overdue-payments', 'title' => 'Overdue Payments'],
                    ['key' => 'supplier-balances', 'title' => 'Supplier Balance Report'],
                ],
                'Project Reports' => [
                    ['key' => 'project-summary', 'title' => 'Project Summary Report'],
                    ['key' => 'project-progress', 'title' => 'Project Progress Report'],
                    ['key' => 'project-budget-usage', 'title' => 'Project Budget Usage Report'],
                    ['key' => 'materials-used-by-project', 'title' => 'Materials Used by Project'],
                    ['key' => 'completed-projects', 'title' => 'Completed Projects'],
                    ['key' => 'delayed-projects', 'title' => 'Delayed Projects'],
                    ['key' => 'staff-task-completion', 'title' => 'Staff Task Completion Report'],
                ],
                'Quotation Reports' => [
                    ['key' => 'quotations-by-status', 'title' => 'Quotations by Status'],
                    ['key' => 'quotation-pipeline', 'title' => 'Pipeline Value'],
                    ['key' => 'approved-quote-value', 'title' => 'Approved Quote Value'],
                    ['key' => 'quotation-conversion-rate', 'title' => 'Conversion Rate'],
                    ['key' => 'quotation-approval-time', 'title' => 'Average Time from Sent to Approval'],
                    ['key' => 'expired-quotations', 'title' => 'Expired Quotations'],
                ],
                'HR Reports' => [
                    ['key' => 'employee-list', 'title' => 'Employee List Report'],
                    ['key' => 'attendance-report', 'title' => 'Attendance Report'],
                    ['key' => 'leave-report', 'title' => 'Leave Report'],
                    ['key' => 'payroll-report', 'title' => 'Payroll Report'],
                    ['key' => 'salary-history', 'title' => 'Salary History Report'],
                    ['key' => 'performance-review', 'title' => 'Performance Review Report'],
                ],
                'Inventory Reports' => [
                    ['key' => 'material-list', 'title' => 'Material List Report'],
                    ['key' => 'stock-levels', 'title' => 'Stock Level Report'],
                    ['key' => 'low-stock', 'title' => 'Low Stock Report'],
                    ['key' => 'stock-movements', 'title' => 'Stock Movement Report'],
                    ['key' => 'inventory-valuation', 'title' => 'Inventory Valuation Report'],
                    ['key' => 'purchase-orders', 'title' => 'Purchase Order Report'],
                    ['key' => 'supplier-report', 'title' => 'Supplier Report'],
                ],
            ],
            'filters' => [
                'projects' => Project::select('id', DB::raw('COALESCE(name, project_name) as name'))->orderBy('name')->get(),
                'clients' => Client::select('id', 'name')->orderBy('name')->get(),
                'suppliers' => Supplier::select('id', 'name')->orderBy('name')->get(),
                'employees' => Employee::select('id', 'name')->orderBy('name')->get(),
            ],
        ];
    }

    public function dashboardSummary(Request $request, DashboardSummaryService $summaryService)
    {
        return response()->json($summaryService->summary($request));
    }

    public function executiveDashboard(Request $request, DashboardSummaryService $summaryService)
    {
        $kpis = $summaryService->summary($request);

        return [
            'kpis' => [...$kpis, 'total_documents' => Document::count()],
            'charts' => [
                'monthly_revenue_expenses' => $this->monthlyRevenueExpenses(),
                'project_status_breakdown' => Project::select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->get(),
                'quotation_conversion' => Quotation::select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->get(),
                'expense_by_category' => $this->expenseByCategoryRows($request)->take(8)->values(),
                'inventory_low_stock' => Material::with('category')->get()->filter(fn ($material) => $material->stock_status !== 'In Stock')->values()->take(10),
                'payroll_by_month' => Payroll::select('year', 'month', DB::raw('SUM(net_salary) as total'))->groupBy('year', 'month')->orderBy('year')->orderBy('month')->get(),
            ],
            'recent' => [
                'revenue' => Payment::clientRevenue()
                    ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
                    ->with(['client:id,name', 'project:id,name,project_name'])
                    ->latest('payment_date')
                    ->latest('id')
                    ->limit(6)
                    ->get()
                    ->map(fn ($payment) => [
                        'id' => $payment->id,
                        'date' => optional($payment->payment_date)->format('Y-m-d') ?: $payment->payment_date,
                        'client' => $payment->client?->name ?: '-',
                        'project' => $payment->project?->name ?: $payment->project?->project_name ?: '-',
                        'amount' => round((float) $payment->amount, 2),
                    ]),
                'expenses' => Expense::with(['project:id,name,project_name'])
                    ->latest('expense_date')
                    ->latest('id')
                    ->limit(6)
                    ->get()
                    ->map(fn ($expense) => [
                        'id' => $expense->id,
                        'date' => optional($expense->expense_date)->format('Y-m-d') ?: $expense->expense_date,
                        'project' => $expense->project?->name ?: $expense->project?->project_name ?: '-',
                        'category' => $expense->category ?: $expense->description ?: '-',
                        'amount' => round((float) ($expense->total_cost ?: $expense->amount), 2),
                    ]),
                'clients' => Client::latest()->limit(6)->get(['id', 'name', 'phone', 'email', 'created_at']),
                'projects' => Project::with('client:id,name')->latest()->limit(6)->get(['id', 'client_id', 'name', 'project_name', 'status', 'created_at']),
                'employees' => Employee::with('department:id,name')->latest()->limit(6)->get(['id', 'department_id', 'name', 'position', 'status', 'created_at']),
                'documents' => Document::with('project:id,name,project_name')->latest()->limit(6)->get(['id', 'project_id', 'title', 'document_category', 'created_at']),
            ],
        ];
    }

    public function show(Request $request, string $key)
    {
        $report = $this->report($request, $key);
        return $report;
    }

    public function export(Request $request, string $key)
    {
        $format = $request->query('format', 'excel');
        $report = $this->report($request, $key);

        if ($format === 'pdf') {
            return response($this->simplePdf($report['title'], $report['rows']))
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $key . '.pdf"');
        }

        if ($format === 'print') {
            return response($this->printHtml($report['title'], $report['rows']))->header('Content-Type', 'text/html');
        }

        return response($this->csv($report['rows']))
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $key . '.csv"');
    }

    protected function report(Request $request, string $key): array
    {
        $map = [
            'profit-loss' => ['Profit & Loss Report', fn () => [$this->profitLoss($request)]],
            'cash-flow' => ['Cash Flow Report', fn () => $this->cashFlow($request)],
            'revenue-by-project' => ['Revenue by Project', fn () => $this->revenueByProject($request)],
            'revenue-by-client' => ['Revenue by Client', fn () => $this->revenueByClient($request)],
            'expense-by-category' => ['Expense by Category', fn () => $this->expenseByCategoryRows($request)->values()],
            'outstanding-invoices' => ['Outstanding Invoices', fn () => $this->invoiceRows($request, false)],
            'overdue-payments' => ['Overdue Payments', fn () => $this->invoiceRows($request, true)],
            'supplier-balances' => ['Supplier Balance Report', fn () => Supplier::get()->map(fn ($s) => ['supplier' => $s->name, 'category' => $s->category, 'balance' => (float) ($s->current_balance ?? $s->balance ?? 0), 'status' => $s->status])],
            'project-summary' => ['Project Summary Report', fn () => $this->projectRows($request)],
            'project-progress' => ['Project Progress Report', fn () => $this->projectRows($request)->map(fn ($p) => ['project' => $p['project'], 'client' => $p['client'], 'status' => $p['status'], 'progress' => $p['progress']])],
            'project-budget-usage' => ['Project Budget Usage Report', fn () => $this->projectRows($request)->map(fn ($p) => ['project' => $p['project'], 'budget' => $p['budget'], 'actual_cost' => $p['actual_cost'], 'usage_percent' => $p['budget'] > 0 ? round(($p['actual_cost'] / $p['budget']) * 100, 2) : 0])],
            'materials-used-by-project' => ['Materials Used by Project', fn () => $this->materialsUsed($request)],
            'completed-projects' => ['Completed Projects', fn () => $this->projectRows($request, 'Completed')],
            'delayed-projects' => ['Delayed Projects', fn () => $this->projectRows($request, 'Delayed')],
            'staff-task-completion' => ['Staff Task Completion Report', fn () => $this->taskCompletion($request)],
            'quotations-by-status' => ['Quotations by Status', fn () => Quotation::select('status', DB::raw('COUNT(*) as total'), DB::raw('SUM(COALESCE(grand_total, total_amount, 0)) as value'))->groupBy('status')->get()],
            'quotation-pipeline' => ['Pipeline Value', fn () => [['pipeline_value' => Quotation::whereNotIn('status', ['Rejected', 'Expired'])->sum(DB::raw('COALESCE(grand_total, total_amount, 0)'))]]],
            'approved-quote-value' => ['Approved Quote Value', fn () => [['approved_value' => Quotation::where('status', 'Approved')->sum(DB::raw('COALESCE(grand_total, total_amount, 0)'))]]],
            'quotation-conversion-rate' => ['Conversion Rate', fn () => [$this->conversionRate()]],
            'quotation-approval-time' => ['Average Time from Sent to Approval', fn () => [$this->approvalTime()]],
            'expired-quotations' => ['Expired Quotations', fn () => Quotation::with('client')->where('status', 'Expired')->orWhere(fn ($q) => $q->whereDate('valid_until', '<', now())->whereNotIn('status', ['Approved', 'Rejected']))->get()->map(fn ($q) => ['quotation' => $q->quotation_number, 'client' => $q->client?->name, 'value' => (float) ($q->grand_total ?: $q->total_amount), 'valid_until' => optional($q->valid_until)->toDateString(), 'status' => $q->status])],
            'employee-list' => ['Employee List Report', fn () => Employee::with('department')->get()->map(fn ($e) => ['employee' => $e->name, 'department' => $e->department?->name, 'position' => $e->position, 'status' => $e->status, 'monthly_salary' => (float) $e->monthly_salary])],
            'attendance-report' => ['Attendance Report', fn () => DB::table('attendances')->join('employees', 'employees.id', '=', 'attendances.employee_id')->select('employees.name as employee', 'attendances.date', 'attendances.check_in', 'attendances.check_out', 'attendances.total_hours', 'attendances.status')->get()],
            'leave-report' => ['Leave Report', fn () => LeaveRequest::with('employee')->get()->map(fn ($l) => ['employee' => $l->employee?->name, 'type' => $l->leave_type, 'start' => optional($l->start_date)->toDateString(), 'end' => optional($l->end_date)->toDateString(), 'days' => (float) $l->total_days, 'status' => $l->status])],
            'payroll-report' => ['Payroll Report', fn () => Payroll::with('employee')->get()->map(fn ($p) => ['employee' => $p->employee?->name, 'month' => $p->month, 'year' => $p->year, 'net_salary' => (float) $p->net_salary, 'payment_status' => $p->payment_status, 'approval_status' => $p->approval_status])],
            'salary-history' => ['Salary History Report', fn () => DB::table('salary_histories')->join('employees', 'employees.id', '=', 'salary_histories.employee_id')->select('employees.name as employee', 'salary_histories.old_salary', 'salary_histories.new_salary', 'salary_histories.effective_date', 'salary_histories.reason')->get()],
            'performance-review' => ['Performance Review Report', fn () => DB::table('performance_reviews')->join('employees', 'employees.id', '=', 'performance_reviews.employee_id')->select('employees.name as employee', 'performance_reviews.review_period', 'performance_reviews.overall_rating', 'performance_reviews.status')->get()],
            'material-list' => ['Material List Report', fn () => Material::with(['category', 'supplier'])->get()->map(fn ($m) => $this->materialRow($m))],
            'stock-levels' => ['Stock Level Report', fn () => Material::with(['category', 'supplier'])->get()->map(fn ($m) => $this->materialRow($m))],
            'low-stock' => ['Low Stock Report', fn () => Material::with(['category', 'supplier'])->get()->filter(fn ($m) => $m->stock_status !== 'In Stock')->map(fn ($m) => $this->materialRow($m))->values()],
            'stock-movements' => ['Stock Movement Report', fn () => $this->movementRows($request)],
            'inventory-valuation' => ['Inventory Valuation Report', fn () => Material::with('category')->get()->map(fn ($m) => ['material' => $m->name, 'category' => $m->category?->name, 'stock' => (float) $m->current_stock, 'unit_cost' => (float) $m->purchase_price, 'value' => $m->stock_value])],
            'purchase-orders' => ['Purchase Order Report', fn () => PurchaseOrder::with('supplier')->get()->map(fn ($p) => ['po' => $p->order_number, 'supplier' => $p->supplier?->name, 'order_date' => optional($p->order_date)->toDateString(), 'total' => (float) $p->total_amount, 'status' => $p->status])],
            'supplier-report' => ['Supplier Report', fn () => Supplier::get()->map(fn ($s) => ['supplier' => $s->name, 'category' => $s->category, 'phone' => $s->phone, 'balance' => (float) ($s->current_balance ?? $s->balance ?? 0), 'status' => $s->status])],
        ];

        abort_unless(isset($map[$key]), 404, 'Report not found.');
        [$title, $rows] = $map[$key];
        return ['key' => $key, 'title' => $title, 'rows' => collect($rows())->values()];
    }

    protected function period(Request $request): array
    {
        if ($request->filled('start_date') && $request->filled('end_date')) {
            return [Carbon::parse($request->start_date)->startOfDay(), Carbon::parse($request->end_date)->endOfDay()];
        }
        if ($request->filled('month') && $request->filled('year')) {
            $start = Carbon::create($request->integer('year'), $request->integer('month'), 1)->startOfMonth();
            return [$start, $start->copy()->endOfMonth()];
        }
        if ($request->filled('year')) {
            $start = Carbon::create($request->integer('year'), 1, 1)->startOfYear();
            return [$start, $start->copy()->endOfYear()];
        }
        return [null, null];
    }

    protected function dateFilter(Builder $query, Request $request, string $column): Builder
    {
        [$start, $end] = $this->period($request);
        return $query->when($start, fn ($q) => $q->whereBetween($column, [$start, $end]));
    }

    protected function profitLoss(Request $request): array
    {
        $finance = app(DashboardSummaryService::class)->companyFinance($request);
        return [
            'revenue' => $finance['total_revenue'],
            'project_expenses' => $finance['total_project_expenses'],
            'overheads' => $finance['company_overhead'],
            'payroll' => $finance['payroll_expenses'],
            'other_expenses' => $finance['other_company_expenses'],
            'net_profit' => $finance['net_profit'],
        ];
    }

    protected function cashFlow(Request $request)
    {
        $in = $this->dateFilter(app(DashboardSummaryService::class)->approvedClientPaymentQuery(), $request, 'payment_date')->select('payment_date as date', DB::raw("'Inflow' as type"), DB::raw('SUM(amount) as amount'))->groupBy('payment_date')->get();
        $out = $this->dateFilter(Expense::where('approval_status', 'Approved'), $request, 'expense_date')->select('expense_date as date', DB::raw("'Outflow' as type"), DB::raw('SUM(COALESCE(total_cost, amount, 0)) as amount'))->groupBy('expense_date')->get();
        return $in->concat($out)->sortBy('date')->values();
    }

    protected function revenueByProject(Request $request)
    {
        return $this->dateFilter(app(DashboardSummaryService::class)->approvedClientPaymentQuery(), $request, 'payment_date')
            ->with('project')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->select('project_id', DB::raw('SUM(amount) as revenue'))->groupBy('project_id')->get()
            ->map(fn ($row) => ['project' => $row->project?->name ?: $row->project?->project_name ?: 'Unassigned', 'revenue' => (float) $row->revenue]);
    }

    protected function revenueByClient(Request $request)
    {
        return $this->dateFilter(app(DashboardSummaryService::class)->approvedClientPaymentQuery(), $request, 'payment_date')
            ->with('client')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->select('client_id', DB::raw('SUM(amount) as revenue'))->groupBy('client_id')->get()
            ->map(fn ($row) => ['client' => $row->client?->name ?: 'Unassigned', 'revenue' => (float) $row->revenue]);
    }

    protected function expenseByCategoryRows(Request $request)
    {
        return $this->dateFilter(Expense::where('approval_status', 'Approved'), $request, 'expense_date')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('supplier_id'), fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->select(DB::raw("COALESCE(category, 'Uncategorized') as category"), DB::raw('SUM(COALESCE(total_cost, amount, 0)) as total'))
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();
    }

    protected function invoiceRows(Request $request, bool $overdue)
    {
        return Invoice::with(['client', 'project'])
            ->when($overdue, fn ($q) => $q->whereDate('due_date', '<', now()))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->whereNotIn('status', ['Paid', 'Cancelled'])
            ->get()
            ->map(fn ($i) => ['invoice' => $i->invoice_number, 'client' => $i->client?->name, 'project' => $i->project?->name ?: $i->project?->project_name, 'due_date' => optional($i->due_date)->toDateString(), 'amount' => (float) $i->total_amount, 'status' => $i->status]);
    }

    protected function projectRows(Request $request, ?string $status = null)
    {
        return Project::with('client')
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when(! $status && $request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('project_id'), fn ($q) => $q->where('id', $request->project_id))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->get()
            ->map(fn ($p) => ['project' => $p->name ?: $p->project_name, 'client' => $p->client?->name, 'status' => $p->status, 'progress' => (float) $p->progress, 'budget' => (float) $p->budget, 'actual_cost' => (float) $p->actual_cost]);
    }

    protected function materialsUsed(Request $request)
    {
        return InventoryMovement::with(['project', 'material'])
            ->where('movement_type', 'Stock Out')
            ->whereNotNull('project_id')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->get()
            ->map(fn ($m) => ['project' => $m->project?->name ?: $m->project?->project_name, 'material' => $m->material?->name, 'quantity' => (float) $m->quantity, 'unit_cost' => (float) $m->unit_cost, 'total_cost' => (float) $m->total_cost, 'date' => optional($m->movement_date)->toDateString()]);
    }

    protected function taskCompletion(Request $request)
    {
        return Task::with(['assignee', 'assigneeEmployee'])
            ->select('assigned_to', 'employee_id', DB::raw('COUNT(*) as total_tasks'), DB::raw("SUM(CASE WHEN status IN ('Done','Completed') THEN 1 ELSE 0 END) as completed_tasks"))
            ->groupBy('assigned_to', 'employee_id')
            ->get()
            ->map(fn ($row) => ['staff' => $row->assigneeEmployee?->name ?: $row->assignee?->name ?: 'Unassigned', 'total_tasks' => (int) $row->total_tasks, 'completed_tasks' => (int) $row->completed_tasks, 'completion_rate' => $row->total_tasks > 0 ? round(($row->completed_tasks / $row->total_tasks) * 100, 2) : 0]);
    }

    protected function conversionRate(): array
    {
        $total = Quotation::count();
        $approved = Quotation::where('status', 'Approved')->count();
        return ['total_quotations' => $total, 'approved_quotations' => $approved, 'conversion_rate' => $total > 0 ? round(($approved / $total) * 100, 2) : 0];
    }

    protected function approvalTime(): array
    {
        $rows = Quotation::whereNotNull('sent_at')->whereNotNull('approved_at')->get();
        $average = $rows->avg(fn ($q) => $q->sent_at->diffInDays($q->approved_at));
        return ['approved_count' => $rows->count(), 'average_days' => round((float) $average, 2)];
    }

    protected function materialRow(Material $material): array
    {
        return ['material' => $material->name, 'category' => $material->category?->name, 'supplier' => $material->supplier?->name, 'stock' => (float) $material->current_stock, 'minimum' => (float) $material->minimum_stock, 'unit' => $material->unit, 'status' => $material->stock_status, 'value' => $material->stock_value];
    }

    protected function movementRows(Request $request)
    {
        return InventoryMovement::with(['material', 'project', 'supplier'])
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('supplier_id'), fn ($q) => $q->where('supplier_id', $request->supplier_id))
            ->latest('movement_date')
            ->get()
            ->map(fn ($m) => ['material' => $m->material?->name, 'type' => $m->movement_type, 'project' => $m->project?->name ?: $m->project?->project_name, 'supplier' => $m->supplier?->name, 'quantity' => (float) $m->quantity, 'total_cost' => (float) $m->total_cost, 'date' => optional($m->movement_date)->toDateString()]);
    }

    protected function monthlyRevenueExpenses()
    {
        $months = collect(range(0, 11))->map(fn ($i) => now()->startOfMonth()->subMonths(11 - $i));
        return $months->map(function ($month) {
            $start = $month->copy()->startOfMonth();
            $end = $month->copy()->endOfMonth();
            return [
                'month' => $month->format('M Y'),
                'revenue' => (float) app(DashboardSummaryService::class)->approvedClientPaymentQuery($start, $end)->sum('amount'),
                'expenses' => (float) Expense::where('approval_status', 'Approved')->whereBetween('expense_date', [$start, $end])->sum(DB::raw('COALESCE(total_cost, amount, 0)')),
            ];
        });
    }

    protected function csv($rows): string
    {
        $rows = collect($rows)->map(fn ($row) => (array) $row);
        if ($rows->isEmpty()) return "No records\n";
        $headers = array_keys($rows->first());
        $lines = [implode(',', $headers)];
        foreach ($rows as $row) {
            $lines[] = implode(',', array_map(fn ($value) => '"' . str_replace('"', '""', is_scalar($value) ? (string) $value : json_encode($value)) . '"', $headers ? array_values(array_intersect_key($row, array_flip($headers))) : $row));
        }
        return implode("\n", $lines) . "\n";
    }

    protected function printHtml(string $title, $rows): string
    {
        $rows = collect($rows)->map(fn ($row) => (array) $row);
        $headers = $rows->isNotEmpty() ? array_keys($rows->first()) : [];
        $body = $rows->map(fn ($row) => '<tr>' . collect($headers)->map(fn ($key) => '<td>' . e(is_scalar($row[$key] ?? '') ? $row[$key] ?? '' : json_encode($row[$key] ?? '')) . '</td>')->implode('') . '</tr>')->implode('');
        return '<!doctype html><html><head><title>' . e($title) . '</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#111827;color:white}</style></head><body><h1>' . e($title) . '</h1><table><thead><tr>' . collect($headers)->map(fn ($h) => '<th>' . e($h) . '</th>')->implode('') . '</tr></thead><tbody>' . $body . '</tbody></table><script>window.print()</script></body></html>';
    }

    protected function simplePdf(string $title, $rows): string
    {
        $rows = collect($rows)->take(28)->map(fn ($row) => (array) $row)->values();
        $content = [];
        $this->pdfText($content, 'Q INTERIOR DESIGN STUDIO', 42, 790, 16, true);
        $this->pdfText($content, $title, 42, 760, 14, true);
        $y = 728;
        foreach ($rows as $index => $row) {
            $line = ($index + 1) . '. ' . collect($row)->map(fn ($value, $key) => $key . ': ' . (is_scalar($value) ? $value : json_encode($value)))->implode(' | ');
            $this->pdfText($content, mb_strimwidth($line, 0, 115, '...'), 42, $y, 8);
            $y -= 20;
        }
        if ($rows->isEmpty()) $this->pdfText($content, 'No records found.', 42, $y, 10);
        return $this->buildPdf(implode("\n", $content));
    }

    protected function pdfText(array &$content, string $text, int $x, int $y, int $size = 10, bool $bold = false): void
    {
        $content[] = 'BT ' . ($bold ? '/F2' : '/F1') . ' ' . $size . ' Tf 0.10 0.12 0.16 rg ' . $x . ' ' . $y . ' Td (' . $this->pdfEscape($text) . ') Tj ET';
    }

    protected function pdfEscape(string $text): string
    {
        $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text ?: '');
    }

    protected function buildPdf(string $pageContent): string
    {
        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
            '6 0 obj << /Length ' . strlen($pageContent) . " >> stream\n" . $pageContent . "\nendstream endobj",
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= str_pad((string) $offsets[$i], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        return $pdf . "trailer << /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
    }
}
