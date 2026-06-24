<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationVersion extends Model
{
    protected $fillable = [
        'quotation_id',
        'version_number',
        'subtotal',
        'total_discount',
        'total_tax',
        'discount',
        'tax',
        'profit_percentage',
        'profit_amount',
        'total_amount',
        'grand_total',
        'change_notes',
        'status',
        'created_by',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
