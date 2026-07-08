<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Material;
use App\Models\Payment;
use App\Models\Payroll;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\Supplier;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardSummaryService
{
    public function summary(Request $request): array
    {
        if ($request->filled('project_id')) {
            $project = Project::with(['client', 'contractSnapshot'])->findOrFail($request->integer('project_id'));
            $finance = $this->projectFinance($request, $project);

            return [
                ...$finance,
                'active_projects' => in_array($project->status, ['Active', 'In Progress', 'active'], true) ? 1 : 0,
                'completed_projects' => in_array($project->status, ['Completed', 'completed'], true) ? 1 : 0,
                'pending_client_payments' => $finance['total_balance_receivable'] > 0 ? 1 : 0,
                'total_projects' => 1,
                'total_clients' => $project->client_id ? 1 : 0,
                'pending_quotations' => Quotation::where('project_id', $project->id)->whereIn('status', ['Draft', 'Sent', 'Pending', 'Revision Requested'])->count(),
                'approved_quotations' => Quotation::where('project_id', $project->id)->where('status', 'Approved')->count(),
                'outstanding_invoices' => Invoice::where('project_id', $project->id)->whereNotIn('status', ['Paid', 'Cancelled'])->count(),
                'overdue_tasks' => Task::where('project_id', $project->id)->whereDate('deadline', '<', now())->whereNotIn('status', ['Done', 'Completed'])->count(),
                'low_stock_materials' => Material::get()->filter(fn ($material) => $material->stock_status !== 'In Stock')->count(),
                'active_employees' => Employee::where('status', 'Active')->count(),
                'total_employees' => Employee::count(),
                'overdue_payments' => Invoice::where('project_id', $project->id)->whereDate('due_date', '<', now())->whereNotIn('status', ['Paid', 'Cancelled'])->count(),
                'pending_tasks' => Task::where('project_id', $project->id)->whereNotIn('status', ['Done', 'Completed'])->count(),
                'pending_purchase_orders' => PurchaseOrder::where('project_id', $project->id)->whereIn('status', ['Draft', 'Ordered', 'Partially Received'])->count(),
                'pending_leave_requests' => DB::table('leave_requests')->where('status', 'Pending')->count(),
                'payroll_pending_approval' => Payroll::whereIn('approval_status', ['Draft', 'Prepared', 'Pending'])->count(),
                'supplier_outstanding_balance' => round((float) Supplier::sum(DB::raw('COALESCE(current_balance, balance, 0)')), 2),
            ];
        }

        $finance = $this->companyFinance($request);

        return [
            ...$finance,
            'active_projects' => Project::whereIn('status', ['Active', 'In Progress', 'active'])->count(),
            'completed_projects' => Project::whereIn('status', ['Completed', 'completed'])->count(),
            'pending_client_payments' => Project::query()
                ->whereRaw('COALESCE(NULLIF(contract_amount, 0), NULLIF(revenue, 0), NULLIF(budget, 0), 0) > COALESCE(paid_amount, 0)')
                ->count(),
            'total_projects' => Project::count(),
            'total_clients' => Client::count(),
            'pending_quotations' => Quotation::whereIn('status', ['Draft', 'Sent', 'Pending', 'Revision Requested'])->count(),
            'approved_quotations' => Quotation::where('status', 'Approved')->count(),
            'outstanding_invoices' => Invoice::whereNotIn('status', ['Paid', 'Cancelled'])->count(),
            'overdue_tasks' => Task::whereDate('deadline', '<', now())->whereNotIn('status', ['Done', 'Completed'])->count(),
            'low_stock_materials' => Material::get()->filter(fn ($material) => $material->stock_status !== 'In Stock')->count(),
            'active_employees' => Employee::where('status', 'Active')->count(),
            'total_employees' => Employee::count(),
            'overdue_payments' => Invoice::whereDate('due_date', '<', now())->whereNotIn('status', ['Paid', 'Cancelled'])->count(),
            'pending_tasks' => Task::whereNotIn('status', ['Done', 'Completed'])->count(),
            'pending_purchase_orders' => PurchaseOrder::whereIn('status', ['Draft', 'Ordered', 'Partially Received'])->count(),
            'pending_leave_requests' => DB::table('leave_requests')->where('status', 'Pending')->count(),
            'payroll_pending_approval' => Payroll::whereIn('approval_status', ['Draft', 'Prepared', 'Pending'])->count(),
            'supplier_outstanding_balance' => round((float) Supplier::sum(DB::raw('COALESCE(current_balance, balance, 0)')), 2),
        ];
    }

    public function companyFinance(Request $request): array
    {
        [$start, $end] = $this->period($request);

        $revenue = (float) $this->approvedClientPaymentQuery($start, $end)->sum('amount');
        $contractAmount = (float) Project::query()
            ->when($start, fn (Builder $query) => $query->whereBetween('created_at', [$start, $end]))
            ->sum(DB::raw('COALESCE(NULLIF(contract_amount, 0), NULLIF(revenue, 0), NULLIF(budget, 0), 0)'));

        $projectCosts = (float) $this->approvedExpenseQuery('project', $start, $end)
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
        $overheads = $this->overheadTotal($start, $end);
        $payroll = $this->payrollTotal($request, $start, $end);
        $otherCompanyExpenses = (float) Expense::where('approval_status', 'Approved')
            ->whereNotIn('expense_type', ['project', 'overhead', 'payroll'])
            ->when($start, fn (Builder $query) => $query->whereBetween('expense_date', [$start, $end]))
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
        $unmatchedSupplierPayments = (float) Payment::supplierPayment()
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
            ->whereNull('project_id')
            ->whereNull('invoice_id')
            ->when($start, fn (Builder $query) => $query->whereBetween('payment_date', [$start, $end]))
            ->sum('amount');

        $grossProfit = $revenue - $projectCosts;
        $netProfit = $revenue - $projectCosts - $overheads - $payroll - $otherCompanyExpenses;
        $cashOut = $projectCosts + $overheads + $payroll + $otherCompanyExpenses + $unmatchedSupplierPayments;
        $expectedProfit = $contractAmount - $projectCosts;

        return [
            'total_contract_amount' => round($contractAmount, 2),
            'total_revenue' => round($revenue, 2),
            'total_revenue_received' => round($revenue, 2),
            'total_balance_receivable' => round(max(0, $contractAmount - $revenue), 2),
            'total_project_costs' => round($projectCosts, 2),
            'total_project_expenses' => round($projectCosts, 2),
            'cash_left' => round($revenue - $cashOut, 2),
            'cash_out' => round($cashOut, 2),
            'expected_profit' => round($expectedProfit, 2),
            'total_expenses' => round($projectCosts + $overheads + $payroll + $otherCompanyExpenses, 2),
            'gross_profit' => round($grossProfit, 2),
            'company_overhead' => round($overheads, 2),
            'overhead_expenses' => round($overheads, 2),
            'payroll_expenses' => round($payroll, 2),
            'other_company_expenses' => round($otherCompanyExpenses, 2),
            'unmatched_supplier_payments' => round($unmatchedSupplierPayments, 2),
            'net_profit' => round($netProfit, 2),
            'profit_margin' => $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0,
        ];
    }

    public function projectFinance(Request $request, Project $project): array
    {
        [$start, $end] = $this->period($request);

        $contractAmount = (float) ($project->contractSnapshot?->contract_amount ?: $project->contract_amount ?: $project->revenue ?: $project->budget ?: 0);
        $totalQuotation = (float) ($project->contractSnapshot?->total_quotation ?: $project->total_quotation ?: 0);
        $revenue = (float) Payment::clientRevenue()
            ->where('project_id', $project->id)
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
            ->when($start, fn (Builder $query) => $query->whereBetween('payment_date', [$start, $end]))
            ->sum('amount');
        $projectCosts = (float) Expense::where('project_id', $project->id)
            ->where('approval_status', 'Approved')
            ->where(fn (Builder $query) => $query->where('expense_type', 'project')->orWhereNull('expense_type'))
            ->when($start, fn (Builder $query) => $query->whereBetween('expense_date', [$start, $end]))
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
        $unmatchedSupplierPayments = (float) Payment::supplierPayment()
            ->where('project_id', $project->id)
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
            ->whereNull('invoice_id')
            ->when($start, fn (Builder $query) => $query->whereBetween('payment_date', [$start, $end]))
            ->sum('amount');
        $companyOverhead = $this->overheadTotal($start, $end);
        $payroll = $this->payrollTotal($request, $start, $end);
        $expectedProfit = $contractAmount - $projectCosts;
        $actualProfit = $revenue - $projectCosts;
        $cashOut = $projectCosts + $unmatchedSupplierPayments;

        return [
            'scope' => 'project',
            'selected_project' => [
                'id' => $project->id,
                'name' => $project->name ?: $project->project_name,
                'client' => $project->client?->name,
            ],
            'total_contract_amount' => round($contractAmount, 2),
            'total_quotation' => round($totalQuotation, 2),
            'total_revenue' => round($revenue, 2),
            'total_revenue_received' => round($revenue, 2),
            'total_balance_receivable' => round(max(0, $contractAmount - $revenue), 2),
            'total_project_costs' => round($projectCosts, 2),
            'total_project_expenses' => round($projectCosts, 2),
            'cash_left' => round($revenue - $cashOut, 2),
            'cash_out' => round($cashOut, 2),
            'expected_profit' => round($expectedProfit, 2),
            'actual_profit' => round($actualProfit, 2),
            'gross_profit' => round($actualProfit, 2),
            'net_profit' => round($actualProfit, 2),
            'company_overhead' => round($companyOverhead, 2),
            'overhead_expenses' => round($companyOverhead, 2),
            'payroll_expenses' => round($payroll, 2),
            'other_company_expenses' => 0.0,
            'unmatched_supplier_payments' => round($unmatchedSupplierPayments, 2),
            'payment_percentage' => $contractAmount > 0 ? round(($revenue / $contractAmount) * 100, 2) : 0,
            'profit_margin' => $contractAmount > 0 ? round(($expectedProfit / $contractAmount) * 100, 2) : 0,
            'client_payment_count' => Payment::clientRevenue()->where('project_id', $project->id)->count(),
            'expense_count' => Expense::where('project_id', $project->id)->count(),
            'invoice_count' => Invoice::where('project_id', $project->id)->count(),
        ];
    }

    public function approvedClientPaymentQuery(?Carbon $start = null, ?Carbon $end = null): Builder
    {
        return Payment::clientRevenue()
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
            ->when($start, fn (Builder $query) => $query->whereBetween('payment_date', [$start, $end]));
    }

    public function approvedExpenseQuery(string $type, ?Carbon $start = null, ?Carbon $end = null): Builder
    {
        return Expense::where('approval_status', 'Approved')
            ->where(fn (Builder $query) => $query->where('expense_type', $type)->when($type === 'project', fn ($inner) => $inner->orWhereNull('expense_type')))
            ->when($start, fn (Builder $query) => $query->whereBetween('expense_date', [$start, $end]));
    }

    public function overheadTotal(?Carbon $start = null, ?Carbon $end = null): float
    {
        $overheadRows = DB::table('overheads')
            ->when($start, fn ($query) => $query->whereBetween('overhead_date', [$start, $end]))
            ->sum('amount');

        if ((float) $overheadRows > 0) {
            return (float) $overheadRows;
        }

        return (float) $this->approvedExpenseQuery('overhead', $start, $end)
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
    }

    public function payrollTotal(Request $request, ?Carbon $start = null, ?Carbon $end = null): float
    {
        $payrollRows = Payroll::where('approval_status', '!=', 'Rejected')
            ->when($request->filled('year'), fn (Builder $query) => $query->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn (Builder $query) => $query->where('month', $request->integer('month')))
            ->sum('net_salary');

        if ((float) $payrollRows > 0) {
            return (float) $payrollRows;
        }

        return (float) $this->approvedExpenseQuery('payroll', $start, $end)
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
    }

    public function period(Request $request): array
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
}
