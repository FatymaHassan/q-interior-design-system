<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = [
        'project_id',
        'assigned_to',
        'employee_id',
        'assigned_by',
        'title',
        'description',
        'work_date',
        'related_stage',
        'progress_added',
        'priority',
        'status',
        'deadline',
        'completed_at',
        'notes',
        'admin_note',
        'approved_by',
        'approved_at',
        'rejected_at',
    ];

    protected $casts = [
        'work_date' => 'date',
        'progress_added' => 'decimal:2',
        'completed_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assigneeEmployee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function assigner()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class);
    }

    public function attachments()
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function statusHistories()
    {
        return $this->hasMany(TaskStatusHistory::class);
    }
}
