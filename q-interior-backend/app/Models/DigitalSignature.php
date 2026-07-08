<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DigitalSignature extends Model
{
    protected $fillable = ['client_approval_id', 'client_id', 'signature_file', 'signed_name', 'signed_at', 'ip_address'];

    protected $casts = ['signed_at' => 'datetime'];

    public function clientApproval()
    {
        return $this->belongsTo(ClientApproval::class);
    }

    public function quotationApprovals()
    {
        return $this->hasMany(QuotationApproval::class, 'digital_signature_id');
    }
}
