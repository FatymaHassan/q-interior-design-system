<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationItem extends Model
{
    protected $fillable = [
        'quotation_id',
        'quotation_section_id',
        'quotation_room_id',
        'description',
        'unit_type',
        'area_m2',
        'rate',
        'quantity',
        'unit_price',
        'discount',
        'tax',
        'total',
        'is_manual_total',
        'notes',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'area_m2' => 'decimal:2',
            'rate' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'is_manual_total' => 'boolean',
        ];
    }

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function section()
    {
        return $this->belongsTo(QuotationSection::class, 'quotation_section_id');
    }

    public function room()
    {
        return $this->belongsTo(QuotationRoom::class, 'quotation_room_id');
    }
}
