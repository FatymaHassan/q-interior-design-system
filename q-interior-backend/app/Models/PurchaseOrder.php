<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $fillable = ['supplier_id', 'order_number', 'order_date', 'expected_delivery_date', 'received_date', 'status', 'subtotal', 'discount', 'tax', 'total_amount', 'notes', 'created_by', 'approved_by'];

    public function supplier() { return $this->belongsTo(Supplier::class); }
    public function items() { return $this->hasMany(PurchaseOrderItem::class); }
    public function movements() { return $this->hasMany(InventoryMovement::class); }
}
