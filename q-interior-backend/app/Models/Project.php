<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'client_id',
        'project_stage_id',
        'name',
        'project_name',
        'location',
        'start_date',
        'end_date',
        'deadline',
        'budget',
        'total_quotation',
        'profit_percentage',
        'contract_amount',
        'payment_plan_type',
        'deposit_percentage',
        'deposit_amount',
        'payment_terms',
        'revenue',
        'actual_cost',
        'paid_amount',
        'remaining_balance',
        'expected_profit',
        'actual_profit',
        'profit_margin',
        'payment_percentage',
        'progress',
        'status',
        'description',
        'notes',
        'created_by',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function stage()
    {
        return $this->belongsTo(ProjectStage::class, 'project_stage_id');
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function clientMessages()
    {
        return $this->hasMany(ClientMessage::class);
    }

    public function approvals()
    {
        return $this->hasMany(ClientApproval::class);
    }

    public function members()
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function quotations()
    {
        return $this->hasMany(Quotation::class);
    }

    public function assignedUsers()
    {
        return $this->belongsToMany(User::class, 'project_members')->withPivot('role', 'assigned_at')->withTimestamps();
    }
}
