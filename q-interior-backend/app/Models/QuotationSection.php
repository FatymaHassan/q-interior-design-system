<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationSection extends Model
{
    protected $fillable = ['quotation_id', 'title', 'sort_order'];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function rooms()
    {
        return $this->hasMany(QuotationRoom::class)->orderBy('sort_order');
    }

    public function items()
    {
        return $this->hasMany(QuotationItem::class)->orderBy('sort_order');
    }
}
