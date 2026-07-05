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
use App\Models\ProjectPaymentStage;
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
        [$start, $end] = $this->period($request);

        $revenue = (float) Payment::clientRevenue()
            ->where('status', '!=', 'cancelled')
            ->when($start, fn (Builder $query) => $query->whereBetween('payment_date', [$start, $end]))
            ->sum('amount');

        $contractAmount = (float) Project::query()
            ->when($start, fn (Builder $query) => $query->whereBetween('created_at', [$start, $end]))
            ->sum(DB::raw('COALESCE(NULLIF(contract_amount, 0), NULLIF(revenue, 0), NULLIF(budget, 0), 0)'));

        $projectCosts = (float) Expense::where('approval_status', '!=', 'Rejected')
            ->where(fn (Builder $query) => $query->where('expense_type', 'project')->orWhereNull('expense_type'))
            ->when($start, fn (Builder $query) => $query->whereBetween('expense_date', [$start, $end]))
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));

        $expenseOverheads = (float) Expense::where('approval_status', '!=', 'Rejected')
            ->where('expense_type', 'overhead')
            ->when($start, fn (Builder $query) => $query->whereBetween('expense_date', [$start, $end]))
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));

        $overheads = (float) DB::table('overheads')
            ->when($start, fn ($query) => $query->whereBetween('overhead_date', [$start, $end]))
            ->sum('amount') + $expenseOverheads;

        $expensePayroll = (float) Expense::where('approval_status', '!=', 'Rejected')
            ->where('expense_type', 'payroll')
            ->when($start, fn (Builder $query) => $query->whereBetween('expense_date', [$start, $end]))
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));

        $payroll = (float) Payroll::where('approval_status', '!=', 'Rejected')
            ->when($request->filled('year'), fn (Builder $query) => $query->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn (Builder $query) => $query->where('month', $request->integer('month')))
            ->sum('net_salary') + $expensePayroll;

        $otherCompanyExpenses = (float) Expense::where('approval_status', '!=', 'Rejected')
            ->whereNotIn('expense_type', ['project', 'overhead', 'payroll'])
            ->when($start, fn (Builder $query) => $query->whereBetween('expense_date', [$start, $end]))
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));

        $grossProfit = $revenue - $projectCosts;
        $netProfit = $grossProfit - $overheads - $payroll - $otherCompanyExpenses;
        $cashLeft = $revenue - $projectCosts;
        $expectedProfit = $contractAmount - $projectCosts;

        return [
            'total_contract_amount' => round($contractAmount, 2),
            'total_revenue' => round($revenue, 2),
            'total_revenue_received' => round($revenue, 2),
            'total_balance_receivable' => round(max(0, $contractAmount - $revenue), 2),
            'total_project_costs' => round($projectCosts, 2),
            'total_project_expenses' => round($projectCosts, 2),
            'cash_left' => round($cashLeft, 2),
            'expected_profit' => round($expectedProfit, 2),
            'total_expenses' => round($projectCosts + $overheads + $payroll + $otherCompanyExpenses, 2),
            'gross_profit' => round($grossProfit, 2),
            'company_overhead' => round($overheads, 2),
            'overhead_expenses' => round($overheads, 2),
            'payroll_expenses' => round($payroll, 2),
            'other_company_expenses' => round($otherCompanyExpenses, 2),
            'net_profit' => round($netProfit, 2),
            'profit_margin' => $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0,
            'active_projects' => Project::whereIn('status', ['Active', 'In Progress', 'active'])->count(),
            'completed_projects' => Project::whereIn('status', ['Completed', 'completed'])->count(),
            'pending_client_payments' => Project::query()
                ->whereRaw('COALESCE(NULLIF(contract_amount, 0), NULLIF(revenue, 0), NULLIF(budget, 0), 0) > COALESCE(paid_amount, 0)')
                ->count(),
            'pending_payment_plans' => ProjectPaymentStage::whereIn('status', ['Pending', 'Due', 'Partially Paid'])->count(),
            'overdue_payment_plans' => ProjectPaymentStage::whereDate('due_date', '<', now())->whereNotIn('status', ['Paid', 'Cancelled'])->count(),
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

    private function period(Request $request): array
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
