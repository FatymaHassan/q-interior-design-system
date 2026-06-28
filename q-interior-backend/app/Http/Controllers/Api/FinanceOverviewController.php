<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Overhead;
use App\Models\Payment;
use App\Models\Payroll;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class FinanceOverviewController extends Controller
{
    public function __invoke()
    {
        $revenue = (float) Payment::clientRevenue()->sum('amount');
        $projectExpenses = (float) $this->expenseQuery('project')->sum('total_cost');
        $overheadExpenses = (float) $this->expenseQuery('overhead')->sum('total_cost');
        $payrollExpenses = (float) $this->expenseQuery('payroll')->sum('total_cost');
        $overhead = (float) Overhead::sum('amount') + $overheadExpenses;
        $payroll = (float) Payroll::where('approval_status', '!=', 'Rejected')->sum('net_salary') + $payrollExpenses;
        $supplierPayments = (float) Payment::supplierPayment()->sum('amount');
        $grossProfit = $revenue - $projectExpenses;
        $netProfit = $grossProfit - $overhead - $payroll;

        return response()->json([
            'total_revenue' => $revenue,
            'total_project_expenses' => $projectExpenses,
            'total_overhead' => $overhead,
            'total_payroll' => $payroll,
            'total_supplier_payments' => $supplierPayments,
            'gross_profit' => $grossProfit,
            'net_profit' => $netProfit,
            'profit_margin' => $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0,
            'pending_expenses' => Expense::where('approval_status', 'Pending')->count(),
            'outstanding_invoices' => Invoice::whereNotIn('status', ['Paid', 'Cancelled'])->count(),
            'overdue_invoices' => Invoice::whereDate('due_date', '<', now())->whereNotIn('status', ['Paid', 'Cancelled'])->count(),
            'recent_expenses' => Expense::with(['project', 'supplier', 'categoryModel'])->latest()->take(8)->get(),
            'recent_payments' => Payment::with(['project', 'client'])->latest()->take(8)->get(),
            'recent_invoices' => Invoice::with(['client', 'project'])->latest()->take(8)->get(),
            'budget_tracker' => $this->budgetTracker(),
            'monthly_chart' => collect(range(5, 0))->map(function ($monthsBack) {
                $month = Carbon::now()->subMonths($monthsBack);
                $revenue = (float) Payment::clientRevenue()->whereYear('payment_date', $month->year)->whereMonth('payment_date', $month->month)->sum('amount');
                $expenses = (float) $this->expenseQuery('project')->whereYear('expense_date', $month->year)->whereMonth('expense_date', $month->month)->sum('total_cost');
                $overhead = (float) Overhead::whereYear('overhead_date', $month->year)->whereMonth('overhead_date', $month->month)->sum('amount')
                    + (float) $this->expenseQuery('overhead')->whereYear('expense_date', $month->year)->whereMonth('expense_date', $month->month)->sum('total_cost');
                $payroll = (float) Payroll::where('approval_status', '!=', 'Rejected')->where('year', $month->year)->where('month', $month->month)->sum('net_salary')
                    + (float) $this->expenseQuery('payroll')->whereYear('expense_date', $month->year)->whereMonth('expense_date', $month->month)->sum('total_cost');

                return [
                    'month' => $month->format('M Y'),
                    'revenue' => $revenue,
                    'expenses' => $expenses + $overhead + $payroll,
                ];
            })->values(),
        ]);
    }

    public function pnl(Request $request)
    {
        $projectId = $request->integer('project_id') ?: null;
        $revenue = (float) Payment::clientRevenue()
            ->where('status', '!=', 'cancelled')
            ->when($projectId, fn ($query) => $query->where('project_id', $projectId))
            ->sum('amount');
        $projectCosts = (float) $this->expenseQuery('project')
            ->when($projectId, fn ($query) => $query->where('project_id', $projectId))
            ->sum('total_cost');
        $overhead = $projectId ? 0 : (float) Overhead::sum('amount') + (float) $this->expenseQuery('overhead')->sum('total_cost');
        $payroll = $projectId ? 0 : (float) Payroll::where('approval_status', '!=', 'Rejected')->sum('net_salary') + (float) $this->expenseQuery('payroll')->sum('total_cost');
        $grossProfit = $revenue - $projectCosts;
        $netProfit = $grossProfit - $overhead - $payroll;

        return response()->json([
            'scope' => $projectId ? 'project' : 'company',
            'project_id' => $projectId,
            'revenue' => round($revenue, 2),
            'project_costs' => round($projectCosts, 2),
            'gross_profit' => round($grossProfit, 2),
            'company_overhead' => round($overhead, 2),
            'payroll' => round($payroll, 2),
            'net_profit' => round($netProfit, 2),
            'profit_margin' => $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0,
            'lines' => [
                ['label' => 'Client payments', 'type' => 'income', 'amount' => round($revenue, 2)],
                ['label' => 'Project expenses', 'type' => 'cost', 'amount' => round($projectCosts, 2)],
                ...($projectId ? [] : [
                    ['label' => 'Company overhead', 'type' => 'cost', 'amount' => round($overhead, 2)],
                    ['label' => 'Payroll', 'type' => 'cost', 'amount' => round($payroll, 2)],
                ]),
            ],
        ]);
    }

    public function projectProfitReport(Request $request)
    {
        $projectId = $request->integer('project_id') ?: null;
        $expenseTotals = $this->expenseQuery('project')
            ->when($projectId, fn ($query) => $query->where('project_id', $projectId))
            ->select('project_id', DB::raw('SUM(COALESCE(total_cost, amount, 0)) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        $revenueTotals = Payment::clientRevenue()
            ->where('status', '!=', 'cancelled')
            ->when($projectId, fn ($query) => $query->where('project_id', $projectId))
            ->select('project_id', DB::raw('SUM(amount) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        return response()->json(Project::with('client')
            ->when($projectId, fn ($query) => $query->where('id', $projectId))
            ->get()
            ->map(function ($project) use ($expenseTotals, $revenueTotals) {
            $revenue = (float) ($revenueTotals[$project->id] ?? $project->paid_amount ?? 0);
            $cost = (float) ($expenseTotals[$project->id] ?? 0);
            $profit = $revenue - $cost;

            return [
                'project_id' => $project->id,
                'project' => $project->name ?: $project->project_name,
                'client' => $project->client?->name,
                'contract_amount' => round((float) ($project->contract_amount ?: $project->revenue ?: $project->budget), 2),
                'client_payment' => round($revenue, 2),
                'project_cost' => round($cost, 2),
                'profit' => round($profit, 2),
                'margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0,
            ];
        })->values());
    }

    public function overheadReport()
    {
        $expenseRows = $this->expenseQuery('overhead')->with('categoryModel')->latest('expense_date')->get()->map(fn ($expense) => [
            'date' => $expense->expense_date,
            'category' => $expense->categoryModel?->name ?: $expense->category,
            'title' => $expense->title ?: $expense->item_name,
            'amount' => round((float) ($expense->total_cost ?: $expense->amount), 2),
            'source' => 'Expense',
        ]);

        $overheadRows = Overhead::with('categoryModel')->latest('overhead_date')->get()->map(fn ($overhead) => [
            'date' => $overhead->overhead_date,
            'category' => $overhead->categoryModel?->name ?: $overhead->category,
            'title' => $overhead->title,
            'amount' => round((float) $overhead->amount, 2),
            'source' => 'Overhead',
        ]);

        $rows = collect($expenseRows->all())->merge($overheadRows->all())->sortByDesc('date')->values();

        return response()->json([
            'total' => round((float) $rows->sum('amount'), 2),
            'rows' => $rows,
        ]);
    }

    public function payrollReport()
    {
        $expenseRows = $this->expenseQuery('payroll')->with(['employee', 'categoryModel'])->latest('expense_date')->get()->map(fn ($expense) => [
            'date' => $expense->expense_date,
            'employee' => $expense->employee?->name,
            'category' => $expense->categoryModel?->name ?: $expense->category,
            'amount' => round((float) ($expense->total_cost ?: $expense->amount), 2),
            'source' => 'Expense',
        ]);

        $payrollRows = Payroll::with('employee')->where('approval_status', '!=', 'Rejected')->latest()->get()->map(fn ($payroll) => [
            'date' => $payroll->payment_date,
            'employee' => $payroll->employee?->name,
            'category' => 'Payroll',
            'amount' => round((float) $payroll->net_salary, 2),
            'source' => 'Payroll',
        ]);

        $rows = collect($expenseRows->all())->merge($payrollRows->all())->sortByDesc('date')->values();

        return response()->json([
            'total' => round((float) $rows->sum('amount'), 2),
            'rows' => $rows,
        ]);
    }

    private function budgetTracker()
    {
        $expenseTotals = $this->expenseQuery('project')
            ->select('project_id', DB::raw('SUM(COALESCE(total_cost, amount, 0)) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        $revenueTotals = Payment::clientRevenue()
            ->select('project_id', DB::raw('SUM(amount) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        return Project::with('client')->get()->map(function ($project) use ($expenseTotals, $revenueTotals) {
            $budget = (float) ($project->budget ?? 0);
            $spend = (float) ($expenseTotals[$project->id] ?? $project->actual_cost ?? 0);
            $revenue = (float) ($revenueTotals[$project->id] ?? 0);
            $usage = $budget > 0 ? round(($spend / $budget) * 100, 2) : 0;

            return [
                'project_id' => $project->id,
                'project' => $project->name ?: $project->project_name,
                'client' => $project->client?->name,
                'budget' => $budget,
                'actual_spend' => $spend,
                'budget_used_percent' => $usage,
                'revenue' => $revenue,
                'profit_margin' => $revenue > 0 ? round((($revenue - $spend) / $revenue) * 100, 2) : 0,
                'profit' => round($revenue - $spend, 2),
                'alert' => $usage >= 80,
                'over_budget' => $budget > 0 && $spend > $budget,
            ];
        })->sortByDesc('budget_used_percent')->values();
    }

    private function expenseQuery(string $type)
    {
        return Expense::where('approval_status', '!=', 'Rejected')
            ->where(fn ($query) => $query->where('expense_type', $type)->when($type === 'project', fn ($inner) => $inner->orWhereNull('expense_type')));
    }
}
