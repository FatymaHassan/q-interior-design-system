<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationAttachment extends Model
{
    protected $hidden = ['file_content'];

    protected $fillable = [
        'quotation_id',
        'title',
        'file_path',
        'file_type',
        'file_content',
        'visibility',
        'uploaded_by',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
