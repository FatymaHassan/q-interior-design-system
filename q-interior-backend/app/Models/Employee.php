<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = [
        'user_id',
        'department_id',
        'name',
        'photo',
        'position',
        'specialty',
        'daily_rate',
        'phone',
        'email',
        'address',
        'employment_start_date',
        'contract_type',
        'salary_grade',
        'monthly_salary',
        'emergency_contact_name',
        'emergency_contact_phone',
        'status',
        'portal_last_login_at',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'employment_start_date' => 'date:Y-m-d',
            'portal_last_login_at' => 'datetime',
            'daily_rate' => 'decimal:2',
            'monthly_salary' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class);
    }

    public function salaryHistories()
    {
        return $this->hasMany(SalaryHistory::class);
    }

    public function performanceReviews()
    {
        return $this->hasMany(PerformanceReview::class);
    }

    public function goals()
    {
        return $this->hasMany(EmployeeGoal::class);
    }

    public function projectMemberships()
    {
        return $this->hasMany(ProjectMember::class);
    }
}
