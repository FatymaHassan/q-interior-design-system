<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationRoom extends Model
{
    protected $fillable = ['quotation_id', 'quotation_section_id', 'title', 'sort_order'];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function section()
    {
        return $this->belongsTo(QuotationSection::class, 'quotation_section_id');
    }

    public function items()
    {
        return $this->hasMany(QuotationItem::class)->orderBy('sort_order');
    }
}
