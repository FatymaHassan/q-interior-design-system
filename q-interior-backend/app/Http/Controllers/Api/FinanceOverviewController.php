<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Overhead;
use App\Models\Payment;
use App\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class FinanceOverviewController extends Controller
{
    public function __invoke()
    {
        $revenue = (float) Payment::clientRevenue()->sum('amount');
        $projectExpenses = (float) Expense::where('approval_status', '!=', 'Rejected')->sum('total_cost');
        $overhead = (float) Overhead::sum('amount');
        $supplierPayments = (float) Payment::supplierPayment()->sum('amount');
        $grossProfit = $revenue - $projectExpenses;
        $netProfit = $grossProfit - $overhead;

        return response()->json([
            'total_revenue' => $revenue,
            'total_project_expenses' => $projectExpenses,
            'total_overhead' => $overhead,
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
                $expenses = (float) Expense::where('approval_status', '!=', 'Rejected')->whereYear('expense_date', $month->year)->whereMonth('expense_date', $month->month)->sum('total_cost');
                $overhead = (float) Overhead::whereYear('overhead_date', $month->year)->whereMonth('overhead_date', $month->month)->sum('amount');

                return [
                    'month' => $month->format('M Y'),
                    'revenue' => $revenue,
                    'expenses' => $expenses + $overhead,
                ];
            })->values(),
        ]);
    }

    private function budgetTracker()
    {
        $expenseTotals = Expense::where('approval_status', '!=', 'Rejected')
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
}
