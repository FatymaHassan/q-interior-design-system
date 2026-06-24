<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    protected $fillable = ['purchase_order_id', 'material_id', 'quantity_ordered', 'quantity_received', 'unit_price', 'total'];

    public function purchaseOrder() { return $this->belongsTo(PurchaseOrder::class); }
    public function material() { return $this->belongsTo(Material::class); }
}
