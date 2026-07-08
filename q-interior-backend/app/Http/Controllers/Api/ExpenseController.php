<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Setting;
use App\Services\ProjectFinanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        return Expense::with(['project', 'supplier', 'employee', 'categoryModel', 'approver'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('supplier_id'), fn ($query, $value) => $query->where('supplier_id', $value))
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))
            ->when($request->query('category_id'), fn ($query, $value) => $query->where('category_id', $value))
            ->when($request->query('expense_type'), fn ($query, $value) => $query->where('expense_type', $value))
            ->when($request->query('payment_method'), fn ($query, $value) => $query->where('payment_method', $value))
            ->when($request->query('approval_status'), fn ($query, $value) => $query->where('approval_status', $value))
            ->when($request->query('month'), fn ($query, $value) => $query->whereMonth('expense_date', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->whereYear('expense_date', $value))
            ->when($request->query('date_from'), fn ($query, $value) => $query->whereDate('expense_date', '>=', $value))
            ->when($request->query('date_to'), fn ($query, $value) => $query->whereDate('expense_date', '<=', $value))
            ->latest()
            ->get();
    }

    public function store(Request $request, ProjectFinanceService $finance)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'employee_id' => 'nullable|exists:employees,id',
            'category_id' => 'nullable|exists:expense_categories,id',
            'expense_type' => 'nullable|in:project,overhead,payroll',
            'title' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'item_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'is_manual_total' => 'nullable|boolean',
            'paid_by' => 'nullable|string|max:255',
            'expense_date' => 'nullable|date',
            'date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'approval_status' => 'nullable|in:Pending,Approved,Rejected',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
            'updated_by' => 'nullable|exists:users,id',
        ]);
        $data = $this->normalizeExpense($data, $request);

        $expense = Expense::create($data);
        if ($expense->project) {
            $finance->refreshProject($expense->project);
        }

        return $expense->load(['project', 'supplier', 'employee', 'categoryModel', 'approver']);
    }

    public function show(Expense $expense)
    {
        return $expense->load(['project', 'supplier', 'employee', 'categoryModel', 'approver']);
    }

    public function update(Request $request, Expense $expense, ProjectFinanceService $finance)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'employee_id' => 'nullable|exists:employees,id',
            'category_id' => 'nullable|exists:expense_categories,id',
            'expense_type' => 'nullable|in:project,overhead,payroll',
            'title' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'item_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'is_manual_total' => 'nullable|boolean',
            'paid_by' => 'nullable|string|max:255',
            'expense_date' => 'nullable|date',
            'date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'approval_status' => 'nullable|in:Pending,Approved,Rejected',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
            'updated_by' => 'nullable|exists:users,id',
        ]);
        $data = $this->normalizeExpense($data, $request, $expense);

        $oldProject = $expense->project;
        $expense->update($data);
        foreach ([$oldProject, $expense->project] as $project) {
            if ($project) {
                $finance->refreshProject($project);
            }
        }

        return $expense->load(['project', 'supplier', 'employee', 'categoryModel', 'approver']);
    }

    public function destroy(Expense $expense, ProjectFinanceService $finance)
    {
        $project = $expense->project;
        $expense->delete();
        if ($project) {
            $finance->refreshProject($project);
        }

        return response()->json(['message' => 'Expense deleted successfully']);
    }

    public function approve(Request $request, Expense $expense, ProjectFinanceService $finance)
    {
        $expense->update([
            'approval_status' => 'Approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        if ($expense->project) {
            $finance->refreshProject($expense->project);
        }

        return $expense->load(['project', 'supplier', 'categoryModel', 'approver']);
    }

    public function reject(Request $request, Expense $expense, ProjectFinanceService $finance)
    {
        $expense->update([
            'approval_status' => 'Rejected',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        if ($expense->project) {
            $finance->refreshProject($expense->project);
        }

        return $expense->load(['project', 'supplier', 'categoryModel', 'approver']);
    }

    private function normalizeExpense(array $data, Request $request, ?Expense $expense = null): array
    {
        $data['title'] = $data['title'] ?? $data['item_name'] ?? 'Expense';
        $data['item_name'] = $data['item_name'] ?? $data['title'];
        $category = isset($data['category_id']) ? ExpenseCategory::find($data['category_id']) : $expense?->categoryModel;
        $data['expense_type'] = $data['expense_type'] ?? $category?->expense_type ?? $this->expenseTypeFromCategoryType($category?->type) ?? ($data['project_id'] ?? $expense?->project_id ? 'project' : 'overhead');
        if ($data['expense_type'] === 'project' && empty($data['project_id']) && ! $expense?->project_id) {
            abort(422, 'Project expenses must be linked to a project.');
        }
        if ($data['expense_type'] !== 'project') {
            $data['project_id'] = null;
        }
        if ($data['expense_type'] !== 'payroll') {
            $data['employee_id'] = null;
        }
        $data['unit_price'] = $data['unit_price'] ?? $data['unit_cost'] ?? 0;
        $data['unit_cost'] = $data['unit_cost'] ?? $data['unit_price'];
        $data['expense_date'] = $data['expense_date'] ?? $data['date'] ?? null;
        $quantity = (float) ($data['quantity'] ?? 1);
        $unitCost = (float) ($data['unit_cost'] ?? 0);
        $manualTotal = (bool) ($data['is_manual_total'] ?? $request->boolean('is_manual_total'));
        $total = $manualTotal
            ? (float) ($data['total_cost'] ?? $data['amount'] ?? ($quantity * $unitCost))
            : (float) ($quantity * $unitCost);
        $data['amount'] = $total;
        $data['total_cost'] = $total;
        $data['is_manual_total'] = $manualTotal;

        if ($request->hasFile('receipt')) {
            $data['receipt_file'] = $request->file('receipt')->store('receipts', 'public');
        }

        if (! isset($data['approval_status'])) {
            $autoApproveLimit = (float) (Setting::where('key', 'expense_auto_approve_limit')->value('value') ?? 500);
            $data['approval_status'] = $total > $autoApproveLimit ? 'Pending' : 'Approved';
        }

        if ($data['approval_status'] === 'Approved' && ! ($expense?->approved_at)) {
            $data['approved_by'] = $request->user()?->id ?? $data['approved_by'] ?? null;
            $data['approved_at'] = Carbon::now();
        }

        unset($data['date'], $data['receipt']);

        return $data;
    }

    private function expenseTypeFromCategoryType(?string $type): ?string
    {
        return match ($type) {
            'overhead' => 'overhead',
            'payroll' => 'payroll',
            'project_expense', 'inventory', 'other' => 'project',
            default => null,
        };
    }
}
