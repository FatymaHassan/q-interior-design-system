<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        return Expense::with(['project', 'supplier', 'categoryModel', 'approver'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('supplier_id'), fn ($query, $value) => $query->where('supplier_id', $value))
            ->when($request->query('category_id'), fn ($query, $value) => $query->where('category_id', $value))
            ->when($request->query('payment_method'), fn ($query, $value) => $query->where('payment_method', $value))
            ->when($request->query('approval_status'), fn ($query, $value) => $query->where('approval_status', $value))
            ->when($request->query('month'), fn ($query, $value) => $query->whereMonth('expense_date', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->whereYear('expense_date', $value))
            ->when($request->query('date_from'), fn ($query, $value) => $query->whereDate('expense_date', '>=', $value))
            ->when($request->query('date_to'), fn ($query, $value) => $query->whereDate('expense_date', '<=', $value))
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'category_id' => 'nullable|exists:expense_categories,id',
            'title' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'item_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'paid_by' => 'nullable|string|max:255',
            'expense_date' => 'nullable|date',
            'date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'approval_status' => 'nullable|in:Pending,Approved,Rejected',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data = $this->normalizeExpense($data, $request);

        return Expense::create($data)->load(['project', 'supplier', 'categoryModel', 'approver']);
    }

    public function show(Expense $expense)
    {
        return $expense->load(['project', 'supplier', 'categoryModel', 'approver']);
    }

    public function update(Request $request, Expense $expense)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'category_id' => 'nullable|exists:expense_categories,id',
            'title' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'item_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'amount' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'paid_by' => 'nullable|string|max:255',
            'expense_date' => 'nullable|date',
            'date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'approval_status' => 'nullable|in:Pending,Approved,Rejected',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data = $this->normalizeExpense($data, $request, $expense);

        $expense->update($data);

        return $expense->load(['project', 'supplier', 'categoryModel', 'approver']);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully']);
    }

    public function approve(Request $request, Expense $expense)
    {
        $expense->update([
            'approval_status' => 'Approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        return $expense->load(['project', 'supplier', 'categoryModel', 'approver']);
    }

    public function reject(Request $request, Expense $expense)
    {
        $expense->update([
            'approval_status' => 'Rejected',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        return $expense->load(['project', 'supplier', 'categoryModel', 'approver']);
    }

    private function normalizeExpense(array $data, Request $request, ?Expense $expense = null): array
    {
        $data['title'] = $data['title'] ?? $data['item_name'] ?? 'Expense';
        $data['item_name'] = $data['item_name'] ?? $data['title'];
        $data['unit_price'] = $data['unit_price'] ?? $data['unit_cost'] ?? 0;
        $data['unit_cost'] = $data['unit_cost'] ?? $data['unit_price'];
        $data['expense_date'] = $data['expense_date'] ?? $data['date'] ?? null;
        $quantity = (float) ($data['quantity'] ?? 1);
        $unitCost = (float) ($data['unit_cost'] ?? 0);
        $total = (float) ($data['total_cost'] ?? $data['amount'] ?? ($quantity * $unitCost));
        $data['amount'] = $total;
        $data['total_cost'] = $total;

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
}
