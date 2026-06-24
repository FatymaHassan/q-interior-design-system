<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    protected $fillable = ['material_id', 'project_id', 'supplier_id', 'purchase_order_id', 'movement_type', 'quantity', 'unit_cost', 'total_cost', 'movement_date', 'reason', 'notes', 'created_by'];

    public function material() { return $this->belongsTo(Material::class); }
    public function project() { return $this->belongsTo(Project::class); }
    public function supplier() { return $this->belongsTo(Supplier::class); }
    public function purchaseOrder() { return $this->belongsTo(PurchaseOrder::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
