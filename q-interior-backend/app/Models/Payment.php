<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    public const CLIENT_TYPES = ['client', 'client_payment'];

    public const SUPPLIER_TYPES = ['supplier', 'supplier_payment'];

    protected $fillable = [
        'project_id',
        'client_id',
        'supplier_id',
        'invoice_id',
        'type',
        'amount',
        'payment_date',
        'payment_method',
        'reference_number',
        'receipt_file',
        'method',
        'status',
        'notes',
        'created_by',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function scopeClientRevenue($query)
    {
        return $query->whereIn('type', self::CLIENT_TYPES);
    }

    public function scopeSupplierPayment($query)
    {
        return $query->whereIn('type', self::SUPPLIER_TYPES);
    }

    public static function isClientType(?string $type): bool
    {
        return in_array($type, self::CLIENT_TYPES, true);
    }

    public static function isSupplierType(?string $type): bool
    {
        return in_array($type, self::SUPPLIER_TYPES, true);
    }
}
