<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Project;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

class ProjectFinanceService
{
    public function approvedClientPayments(Project $project)
    {
        return $project->payments()
            ->clientRevenue()
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')");
    }

    public function approvedProjectExpenses(Project $project)
    {
        return $project->expenses()
            ->where('approval_status', 'Approved')
            ->where(fn ($query) => $query->where('expense_type', 'project')->orWhereNull('expense_type'));
    }

    public function metrics(Project $project): array
    {
        $contract = (float) ($project->contract_amount ?: $project->revenue ?: $project->budget ?: 0);
        $paid = (float) $this->approvedClientPayments($project)->sum('amount');
        $actualCost = (float) $this->approvedProjectExpenses($project)->sum(DB::raw('COALESCE(total_cost, amount, 0)'));
        $expectedProfit = $contract - $actualCost;
        $actualProfit = $paid - $actualCost;

        return [
            'contract_amount' => round($contract, 2),
            'paid_amount' => round($paid, 2),
            'remaining_balance' => round(max(0, $contract - $paid), 2),
            'actual_cost' => round($actualCost, 2),
            'expected_profit' => round($expectedProfit, 2),
            'actual_profit' => round($actualProfit, 2),
            'payment_percentage' => $contract > 0 ? round(($paid / $contract) * 100, 2) : 0,
            'profit_margin' => $contract > 0 ? round(($expectedProfit / $contract) * 100, 2) : 0,
        ];
    }

    public function refreshProject(Project $project): Project
    {
        $metrics = $this->metrics($project);

        $project->forceFill([
            'contract_amount' => $metrics['contract_amount'],
            'total_quotation' => (float) ($project->total_quotation ?: $metrics['contract_amount']),
            'deposit_amount' => round($metrics['contract_amount'] * ((float) ($project->deposit_percentage ?: 0)) / 100, 2),
            'actual_cost' => $metrics['actual_cost'],
            'paid_amount' => $metrics['paid_amount'],
            'remaining_balance' => $metrics['remaining_balance'],
            'expected_profit' => $metrics['expected_profit'],
            'actual_profit' => $metrics['actual_profit'],
            'payment_percentage' => $metrics['payment_percentage'],
            'profit_margin' => $metrics['profit_margin'],
        ])->save();

        $project->invoices()->get()->each(fn (Invoice $invoice) => $this->refreshInvoice($invoice));

        return $project->refresh();
    }

    public function refreshInvoice(Invoice $invoice): Invoice
    {
        $paid = (float) $invoice->payments()
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
            ->sum('amount');
        $balance = max(0, (float) $invoice->total_amount - $paid);
        $status = $invoice->status;

        if ($balance <= 0 && (float) $invoice->total_amount > 0) {
            $status = 'Paid';
        } elseif ($paid > 0) {
            $status = 'Partially Paid';
        } elseif ($invoice->due_date && $invoice->due_date->isPast()) {
            $status = 'Overdue';
        } elseif (! in_array($status, ['Draft', 'Sent', 'Received', 'Cancelled'], true)) {
            $status = 'Unpaid';
        }

        $invoice->forceFill([
            'paid_amount' => round($paid, 2),
            'balance_due' => round($balance, 2),
            'status' => $status,
        ])->save();

        if ($invoice->project) {
            $this->refreshProjectTotalsOnly($invoice->project);
        }
        if ($invoice->supplier) {
            $this->refreshSupplier($invoice->supplier);
        }

        return $invoice->refresh();
    }

    public function refreshSupplier(Supplier $supplier): Supplier
    {
        $invoiceTotal = (float) $supplier->invoices()
            ->where('invoice_type', 'supplier')
            ->where('status', '!=', 'Cancelled')
            ->sum('total_amount');
        $paid = (float) $supplier->payments()
            ->supplierPayment()
            ->whereRaw("LOWER(COALESCE(status, '')) IN ('paid', 'completed', 'approved')")
            ->sum('amount');
        $balance = (float) $supplier->opening_balance + $invoiceTotal - $paid;

        $supplier->forceFill([
            'paid_amount' => round($paid, 2),
            'current_balance' => round($balance, 2),
            'balance' => round($balance, 2),
        ])->save();

        return $supplier->refresh();
    }

    public function summary(Project $project): array
    {
        $project = $this->refreshProject($project);

        $clientPayments = $this->approvedClientPayments($project)->with(['client', 'invoice'])->latest()->get();
        $supplierPayments = $project->payments()->supplierPayment()->with(['supplier', 'invoice'])->latest()->get();
        $clientInvoices = $project->invoices()->where('invoice_type', 'client')->with(['client', 'items'])->latest()->get();
        $supplierInvoices = $project->invoices()->where('invoice_type', 'supplier')->with(['supplier', 'items'])->latest()->get();
        $expenses = $this->approvedProjectExpenses($project)
            ->with(['supplier', 'categoryModel'])
            ->latest()
            ->get();

        $projectExpenses = (float) $expenses->sum(fn ($expense) => (float) ($expense->total_cost ?: $expense->amount));
        $expenseBreakdown = $this->expenseBreakdown($expenses);
        $supplierPayables = (float) $supplierInvoices->sum('balance_due');
        $received = (float) $clientPayments->sum('amount');
        $projectRevenue = (float) ($project->contract_amount ?: $project->revenue ?: $project->budget ?: $received);
        $expectedProfit = $projectRevenue - $projectExpenses;
        $actualProfit = $received - $projectExpenses;
        $paymentStatus = $projectRevenue > 0 && $received >= $projectRevenue
            ? 'Fully Paid'
            : ($received > 0 ? 'Partially Paid' : 'Unpaid');

        return [
            'project' => $project->load('client'),
            'metrics' => [
                'contract_amount' => round($projectRevenue, 2),
                'expected_revenue' => round($projectRevenue, 2),
                'received_revenue' => round($received, 2),
                'balance_receivable' => round(max(0, $projectRevenue - $received), 2),
                'outstanding_client_balance' => round(max(0, $projectRevenue - $received), 2),
                'deposit_amount' => round((float) $project->deposit_amount, 2),
                'payment_percentage' => (float) $project->payment_percentage,
                'payment_progress' => $projectRevenue > 0 ? round(($received / $projectRevenue) * 100, 2) : 0,
                'payment_status' => $paymentStatus,
                'total_project_expenses' => round($projectExpenses, 2),
                'cash_left' => round($received - $projectExpenses, 2),
                'total_project_cost' => round($projectExpenses, 2),
                'design_costs' => $expenseBreakdown['Design Costs'],
                'materials' => $expenseBreakdown['Materials'],
                'labour_costs' => $expenseBreakdown['Labour Costs'],
                'site_expenses' => $expenseBreakdown['Site Expenses'],
                'other_project_costs' => $expenseBreakdown['Other Project Costs'],
                'project_expenses' => round($projectExpenses, 2),
                'supplier_costs' => 0.0,
                'supplier_payables' => round($supplierPayables, 2),
                'project_profit' => round($expectedProfit, 2),
                'expected_profit' => round($expectedProfit, 2),
                'actual_profit' => round($actualProfit, 2),
                'actual_profit_from_received_money' => round($actualProfit, 2),
                'profit_margin' => $projectRevenue > 0 ? round(($expectedProfit / $projectRevenue) * 100, 2) : 0,
                'expense_usage' => $projectRevenue > 0 ? round(($projectExpenses / $projectRevenue) * 100, 2) : 0,
            ],
            'expense_breakdown' => $expenseBreakdown,
            'client_payments' => $clientPayments,
            'supplier_payments' => $supplierPayments,
            'client_invoices' => $clientInvoices,
            'supplier_invoices' => $supplierInvoices,
            'project_expenses' => $expenses,
        ];
    }

    private function refreshProjectTotalsOnly(Project $project): void
    {
        $metrics = $this->metrics($project);
        $project->forceFill([
            'paid_amount' => $metrics['paid_amount'],
            'remaining_balance' => $metrics['remaining_balance'],
            'expected_profit' => $metrics['expected_profit'],
            'actual_profit' => $metrics['actual_profit'],
            'payment_percentage' => $metrics['payment_percentage'],
            'profit_margin' => $metrics['profit_margin'],
        ])->save();
    }

    private function expenseBreakdown($expenses): array
    {
        $groups = [
            'Design Costs' => 0.0,
            'Materials' => 0.0,
            'Labour Costs' => 0.0,
            'Site Expenses' => 0.0,
            'Other Project Costs' => 0.0,
        ];

        foreach ($expenses as $expense) {
            $group = $expense->categoryModel?->group_name ?: $this->inferExpenseGroup($expense->categoryModel?->name ?: $expense->category ?: $expense->title);
            if (! array_key_exists($group, $groups)) {
                $group = 'Other Project Costs';
            }
            $groups[$group] += (float) ($expense->total_cost ?: $expense->amount);
        }

        return collect($groups)->map(fn ($value) => round($value, 2))->all();
    }

    private function inferExpenseGroup(?string $name): string
    {
        $name = strtolower((string) $name);

        return match (true) {
            str_contains($name, 'design'), str_contains($name, 'drawing'), str_contains($name, 'render') => 'Design Costs',
            str_contains($name, 'material'), str_contains($name, 'inventory'), str_contains($name, 'wood'), str_contains($name, 'paint') => 'Materials',
            str_contains($name, 'labour'), str_contains($name, 'labor'), str_contains($name, 'worker'), str_contains($name, 'contractor') => 'Labour Costs',
            str_contains($name, 'site'), str_contains($name, 'transport'), str_contains($name, 'fuel') => 'Site Expenses',
            default => 'Other Project Costs',
        };
    }
}
