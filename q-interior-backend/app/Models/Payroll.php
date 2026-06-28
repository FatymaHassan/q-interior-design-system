<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = ['employee_id', 'month', 'year', 'base_salary', 'total_working_days', 'present_days', 'leave_days', 'absent_days', 'late_days', 'overtime_amount', 'bonus', 'deduction', 'net_salary', 'payment_status', 'approval_status', 'payment_date', 'payment_method', 'notes', 'prepared_by', 'approved_by'];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date:Y-m-d',
            'base_salary' => 'decimal:2',
            'overtime_amount' => 'decimal:2',
            'bonus' => 'decimal:2',
            'deduction' => 'decimal:2',
            'net_salary' => 'decimal:2',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }
}
