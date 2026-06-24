<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    protected $fillable = ['employee_id', 'year', 'leave_type', 'total_allowed_days', 'used_days', 'remaining_days'];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
