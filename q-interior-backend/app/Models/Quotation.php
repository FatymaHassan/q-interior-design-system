<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number',
        'client_id',
        'client_name',
        'project_id',
        'invoice_id',
        'title',
        'project_title',
        'project_type',
        'location',
        'quotation_date',
        'valid_until',
        'subtotal',
        'total_discount',
        'total_tax',
        'discount',
        'tax',
        'profit_percentage',
        'profit_amount',
        'total_amount',
        'grand_total',
        'payment_terms',
        'payment_account_name',
        'payment_bank',
        'payment_account_no',
        'payment_phone',
        'payment_notes',
        'deposit_percentage',
        'notes',
        'special_conditions',
        'scope_exclusions',
        'terms_conditions',
        'footer_note',
        'status',
        'sent_at',
        'sent_by',
        'approved_at',
        'rejected_at',
        'locked_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'quotation_date' => 'date',
            'valid_until' => 'date',
            'sent_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'locked_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'total_discount' => 'decimal:2',
            'total_tax' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'profit_percentage' => 'decimal:2',
            'profit_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'deposit_percentage' => 'decimal:2',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function items()
    {
        return $this->hasMany(QuotationItem::class)->orderBy('sort_order');
    }

    public function sections()
    {
        return $this->hasMany(QuotationSection::class)->orderBy('sort_order');
    }

    public function rooms()
    {
        return $this->hasMany(QuotationRoom::class)->orderBy('sort_order');
    }

    public function versions()
    {
        return $this->hasMany(QuotationVersion::class)->latest();
    }

    public function attachments()
    {
        return $this->hasMany(QuotationAttachment::class);
    }

    public function approvals()
    {
        return $this->hasMany(QuotationApproval::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
