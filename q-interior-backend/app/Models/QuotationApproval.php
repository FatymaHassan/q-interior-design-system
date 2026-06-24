<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationApproval extends Model
{
    protected $fillable = [
        'quotation_id',
        'client_id',
        'status',
        'client_comment',
        'signed_name',
        'signed_at',
        'ip_address',
        'digital_signature_id',
        'approved_at',
        'rejected_at',
        'revision_requested_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'revision_requested_at' => 'datetime',
        ];
    }

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
