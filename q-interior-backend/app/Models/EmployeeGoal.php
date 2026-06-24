<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeGoal extends Model
{
    protected $fillable = ['employee_id', 'title', 'description', 'target_date', 'status', 'progress', 'manager_comment'];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
