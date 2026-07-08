<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectContractSnapshot extends Model
{
    protected $fillable = [
        'project_id',
        'client_id',
        'client_name',
        'project_name',
        'contract_amount',
        'total_quotation',
        'budget',
        'profit_percentage',
        'deposit_percentage',
        'deposit_amount',
        'payment_terms',
        'created_by',
    ];

    protected $casts = [
        'contract_amount' => 'decimal:2',
        'total_quotation' => 'decimal:2',
        'budget' => 'decimal:2',
        'profit_percentage' => 'decimal:2',
        'deposit_percentage' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
