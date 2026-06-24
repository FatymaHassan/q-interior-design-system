<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryHistory extends Model
{
    protected $fillable = ['employee_id', 'old_salary', 'new_salary', 'effective_date', 'reason', 'changed_by'];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
