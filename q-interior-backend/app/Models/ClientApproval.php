<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientApproval extends Model
{
    protected $fillable = [
        'project_id',
        'client_id',
        'title',
        'description',
        'approval_type',
        'status',
        'client_comment',
        'approved_at',
    ];

    protected $casts = ['approved_at' => 'datetime'];

    public function signature()
    {
        return $this->hasOne(DigitalSignature::class);
    }
}
