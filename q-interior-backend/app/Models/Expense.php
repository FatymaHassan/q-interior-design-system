<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $fillable = [
        'project_id',
        'supplier_id',
        'employee_id',
        'category_id',
        'expense_type',
        'title',
        'category',
        'item_name',
        'description',
        'quantity',
        'unit_price',
        'unit_cost',
        'amount',
        'total_cost',
        'is_manual_total',
        'paid_by',
        'expense_date',
        'payment_method',
        'receipt_file',
        'approval_status',
        'approved_by',
        'approved_at',
        'notes',
        'created_by',
        'updated_by',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function categoryModel()
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
