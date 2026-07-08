<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Overhead;
use App\Models\Payment;
use App\Models\Payroll;
use App\Models\Project;
use App\Services\DashboardSummaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class FinanceOverviewController extends Controller
{
    public function __invoke(Request $request, DashboardSummaryService $summaryService)
    {
        $finance = $summaryService->companyFinance($request);
        $supplierPayments = (float) Payment::supplierPayment()
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
            ->sum('amount');

        return response()->json([
            'total_revenue' => $finance['total_revenue'],
            'total_project_expenses' => $finance['total_project_expenses'],
            'total_overhead' => $finance['company_overhead'],
            'total_payroll' => $finance['payroll_expenses'],
            'total_supplier_payments' => $supplierPayments,
            'gross_profit' => $finance['gross_profit'],
            'net_profit' => $finance['net_profit'],
            'profit_margin' => $finance['profit_margin'],
            'pending_expenses' => Expense::where('approval_status', 'Pending')->count(),
            'outstanding_invoices' => Invoice::whereNotIn('status', ['Paid', 'Cancelled'])->count(),
            'overdue_invoices' => Invoice::whereDate('due_date', '<', now())->whereNotIn('status', ['Paid', 'Cancelled'])->count(),
            'recent_expenses' => Expense::with(['project', 'supplier', 'categoryModel'])->latest()->take(8)->get(),
            'recent_payments' => Payment::with(['project', 'client'])->latest()->take(8)->get(),
            'recent_invoices' => Invoice::with(['client', 'project'])->latest()->take(8)->get(),
            'budget_tracker' => $this->budgetTracker(),
            'monthly_chart' => collect(range(5, 0))->map(function ($monthsBack) {
                $month = Carbon::now()->subMonths($monthsBack);
                $start = $month->copy()->startOfMonth();
                $end = $month->copy()->endOfMonth();
                $revenue = (float) app(DashboardSummaryService::class)->approvedClientPaymentQuery($start, $end)->sum('amount');
                $expenses = (float) app(DashboardSummaryService::class)->approvedExpenseQuery('project', $start, $end)->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
                $overhead = app(DashboardSummaryService::class)->overheadTotal($start, $end);
                $payroll = app(DashboardSummaryService::class)->payrollTotal(new Request(['year' => $month->year, 'month' => $month->month]), $start, $end);

                return [
                    'month' => $month->format('M Y'),
                    'revenue' => $revenue,
                    'expenses' => $expenses + $overhead + $payroll,
                ];
            })->values(),
        ]);
    }

    public function pnl(Request $request, DashboardSummaryService $summaryService)
    {
        $projectId = $request->integer('project_id') ?: null;
        $revenue = (float) $summaryService->approvedClientPaymentQuery()
            ->when($projectId, fn ($query) => $query->where('project_id', $projectId))
            ->sum('amount');
        $projectCosts = (float) $summaryService->approvedExpenseQuery('project')
            ->when($projectId, fn ($query) => $query->where('project_id', $projectId))
            ->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
        $overhead = $projectId ? 0 : $summaryService->overheadTotal();
        $payroll = $projectId ? 0 : $summaryService->payrollTotal($request);
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
        $expenseTotals = app(DashboardSummaryService::class)->approvedExpenseQuery('project')
            ->when($projectId, fn ($query) => $query->where('project_id', $projectId))
            ->select('project_id', DB::raw('SUM(COALESCE(total_cost, amount, 0)) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        $revenueTotals = app(DashboardSummaryService::class)->approvedClientPaymentQuery()
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
        $expenseTotals = app(DashboardSummaryService::class)->approvedExpenseQuery('project')
            ->select('project_id', DB::raw('SUM(COALESCE(total_cost, amount, 0)) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        $revenueTotals = app(DashboardSummaryService::class)->approvedClientPaymentQuery()
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
        return Expense::where('approval_status', 'Approved')
            ->where(fn ($query) => $query->where('expense_type', $type)->when($type === 'project', fn ($inner) => $inner->orWhereNull('expense_type')));
    }
}
