<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        return ExpenseCategory::with('creator')
            ->when($request->user()?->hasRole('staff') && ! $request->user()?->hasAnyRole(['admin', 'manager', 'finance']), fn ($query) => $query->where('status', 'Active'))
            ->when($request->query('type'), fn ($query, $value) => $query->where('type', $value))
            ->when($request->query('expense_type'), fn ($query, $value) => $query->where('expense_type', $value))
            ->when($request->query('group_name'), fn ($query, $value) => $query->where('group_name', $value))
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('search'), fn ($query, $value) => $query->where(function ($inner) use ($value) {
                $inner->where('name', 'like', "%{$value}%")
                    ->orWhere('group_name', 'like', "%{$value}%")
                    ->orWhere('description', 'like', "%{$value}%");
            }))
            ->orderBy('expense_type')
            ->orderBy('group_name')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('expense_categories')->where(fn ($query) => $query->where('expense_type', $request->input('expense_type', $this->expenseTypeFromCategoryType($request->input('type', 'project_expense'))))),
            ],
            'type' => 'required|in:project_expense,overhead,inventory,payroll,other',
            'expense_type' => 'nullable|in:project,overhead,payroll',
            'group_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:Active,Inactive',
        ]);
        $data['expense_type'] = $data['expense_type'] ?? $this->expenseTypeFromCategoryType($data['type']);
        $data['group_name'] = $data['group_name'] ?? $this->defaultGroupName($data['expense_type'], $data['type']);
        $data['status'] = $data['status'] ?? 'Active';
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;

        return ExpenseCategory::create($data)->load('creator');
    }

    public function show(ExpenseCategory $expenseCategory)
    {
        return $expenseCategory->load('creator');
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $data = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('expense_categories')->ignore($expenseCategory->id)->where(fn ($query) => $query->where('expense_type', $request->input('expense_type', $expenseCategory->expense_type ?? $this->expenseTypeFromCategoryType($request->input('type', $expenseCategory->type))))),
            ],
            'type' => 'nullable|in:project_expense,overhead,inventory,payroll,other',
            'expense_type' => 'nullable|in:project,overhead,payroll',
            'group_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:Active,Inactive',
        ]);
        if (isset($data['type']) && ! isset($data['expense_type'])) {
            $data['expense_type'] = $this->expenseTypeFromCategoryType($data['type']);
        }
        if (isset($data['expense_type']) && ! array_key_exists('group_name', $data)) {
            $data['group_name'] = $expenseCategory->group_name ?: $this->defaultGroupName($data['expense_type'], $data['type'] ?? $expenseCategory->type);
        }
        $data['updated_by'] = $request->user()?->id;

        $expenseCategory->update($data);

        return $expenseCategory->load('creator');
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        if (Expense::where('category_id', $expenseCategory->id)->exists()) {
            $expenseCategory->update(['status' => 'Inactive']);

            return response()->json(['message' => 'Category is used by expenses, so it was deactivated.', 'category' => $expenseCategory->fresh('creator')]);
        }

        $expenseCategory->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }

    public function status(Request $request, ExpenseCategory $expenseCategory)
    {
        $data = $request->validate(['status' => 'required|in:Active,Inactive']);
        $expenseCategory->update($data + ['updated_by' => $request->user()?->id]);

        return $expenseCategory->load('creator');
    }

    private function expenseTypeFromCategoryType(?string $type): string
    {
        return match ($type) {
            'overhead' => 'overhead',
            'payroll' => 'payroll',
            default => 'project',
        };
    }

    private function defaultGroupName(string $expenseType, ?string $categoryType): string
    {
        return match ($expenseType) {
            'overhead' => 'Company Overhead',
            'payroll' => 'Payroll',
            default => $categoryType === 'inventory' ? 'Materials' : 'Other Project Costs',
        };
    }
}
