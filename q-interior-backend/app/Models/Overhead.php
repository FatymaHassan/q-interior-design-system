<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Overhead extends Model
{
    protected $fillable = [
        'category_id',
        'title',
        'category',
        'description',
        'amount',
        'paid_by',
        'overhead_date',
        'payment_method',
        'receipt_file',
        'notes',
        'created_by',
    ];

    public function categoryModel()
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }
}
