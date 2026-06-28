<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Project;
use App\Models\ProjectPaymentStage;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

class ProjectFinanceService
{
    public function refreshProject(Project $project): Project
    {
        $contract = (float) ($project->contract_amount ?: $project->revenue ?: $project->budget ?: 0);
        $paid = (float) $project->payments()->clientRevenue()->where('status', '!=', 'cancelled')->sum('amount');
        $remaining = max(0, $contract - $paid);

        $project->forceFill([
            'contract_amount' => $contract,
            'deposit_amount' => round($contract * ((float) ($project->deposit_percentage ?: 0)) / 100, 2),
            'paid_amount' => round($paid, 2),
            'remaining_balance' => round($remaining, 2),
            'payment_percentage' => $contract > 0 ? round(($paid / $contract) * 100, 2) : 0,
        ])->save();

        $project->paymentStages()->get()->each(fn (ProjectPaymentStage $stage) => $this->refreshStage($stage));
        $project->invoices()->get()->each(fn (Invoice $invoice) => $this->refreshInvoice($invoice));

        return $project->refresh();
    }

    public function refreshStage(ProjectPaymentStage $stage): ProjectPaymentStage
    {
        $paid = (float) $stage->payments()->where('status', '!=', 'cancelled')->sum('amount');
        $balance = max(0, (float) $stage->amount - $paid);
        $status = $stage->status;

        if ($balance <= 0 && (float) $stage->amount > 0) {
            $status = 'Paid';
        } elseif ($paid > 0) {
            $status = 'Partially Paid';
        } elseif ($stage->due_date && $stage->due_date->isPast()) {
            $status = 'Overdue';
        } elseif (in_array($stage->status, ['Due', 'Pending'], true)) {
            $status = $stage->status;
        }

        $stage->forceFill([
            'paid_amount' => round($paid, 2),
            'balance' => round($balance, 2),
            'status' => $status,
        ])->save();

        return $stage->refresh();
    }

    public function refreshInvoice(Invoice $invoice): Invoice
    {
        $paid = (float) $invoice->payments()->where('status', '!=', 'cancelled')->sum('amount');
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

        if ($invoice->paymentStage) {
            $this->refreshStage($invoice->paymentStage);
        }
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
        $invoiceTotal = (float) $supplier->invoices()->where('invoice_type', 'supplier')->where('status', '!=', 'Cancelled')->sum('total_amount');
        $paid = (float) $supplier->payments()->supplierPayment()->where('status', '!=', 'cancelled')->sum('amount');
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

        $clientPayments = $project->payments()->clientRevenue()->with(['client', 'invoice', 'paymentStage'])->latest()->get();
        $supplierPayments = $project->payments()->supplierPayment()->with(['supplier', 'invoice'])->latest()->get();
        $clientInvoices = $project->invoices()->where('invoice_type', 'client')->with(['client', 'items', 'paymentStage'])->latest()->get();
        $supplierInvoices = $project->invoices()->where('invoice_type', 'supplier')->with(['supplier', 'items'])->latest()->get();
        $expenses = $project->expenses()
            ->where(fn ($query) => $query->where('expense_type', 'project')->orWhereNull('expense_type'))
            ->with(['supplier', 'categoryModel'])
            ->latest()
            ->get();

        $projectExpenses = (float) $expenses->sum(fn ($expense) => (float) ($expense->total_cost ?: $expense->amount));
        $expenseBreakdown = $this->expenseBreakdown($expenses);
        $supplierCosts = (float) $supplierInvoices->sum('total_amount');
        $supplierPayables = (float) $supplierInvoices->sum('balance_due');
        $received = (float) $clientPayments->sum('amount');
        $expected = (float) $project->contract_amount;
        $cost = $projectExpenses + $supplierCosts;
        $profit = $received - $projectExpenses - $supplierCosts;

        return [
            'project' => $project->load('client'),
            'metrics' => [
                'expected_revenue' => round($expected, 2),
                'received_revenue' => round($received, 2),
                'outstanding_client_balance' => round(max(0, $expected - $received), 2),
                'payment_percentage' => (float) $project->payment_percentage,
                'total_project_cost' => round($cost, 2),
                'design_costs' => $expenseBreakdown['Design Costs'],
                'materials' => $expenseBreakdown['Materials'],
                'labour_costs' => $expenseBreakdown['Labour Costs'],
                'site_expenses' => $expenseBreakdown['Site Expenses'],
                'other_project_costs' => $expenseBreakdown['Other Project Costs'],
                'project_expenses' => round($projectExpenses, 2),
                'supplier_costs' => round($supplierCosts, 2),
                'supplier_payables' => round($supplierPayables, 2),
                'project_profit' => round($profit, 2),
                'profit_margin' => $expected > 0 ? round(($profit / $expected) * 100, 2) : 0,
            ],
            'payment_stages' => $project->paymentStages()->with('invoice')->orderBy('id')->get(),
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
        $contract = (float) ($project->contract_amount ?: $project->revenue ?: $project->budget ?: 0);
        $paid = (float) $project->payments()->clientRevenue()->where('status', '!=', 'cancelled')->sum('amount');
        $project->forceFill([
            'paid_amount' => round($paid, 2),
            'remaining_balance' => round(max(0, $contract - $paid), 2),
            'payment_percentage' => $contract > 0 ? round(($paid / $contract) * 100, 2) : 0,
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
