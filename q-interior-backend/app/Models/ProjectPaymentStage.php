<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectPaymentStage extends Model
{
    protected $fillable = [
        'project_id',
        'name',
        'description',
        'payment_type',
        'percentage',
        'amount',
        'due_condition',
        'due_date',
        'status',
        'invoice_id',
        'paid_amount',
        'balance',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'percentage' => 'decimal:2',
            'amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'balance' => 'decimal:2',
        ];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'payment_stage_id');
    }
}
