<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Material extends Model
{
    protected $fillable = ['material_category_id', 'supplier_id', 'name', 'code', 'unit', 'purchase_price', 'selling_price', 'current_stock', 'minimum_stock', 'storage_location', 'description', 'notes', 'status', 'created_by', 'updated_by'];

    protected $appends = ['stock_status', 'stock_value'];

    public function category() { return $this->belongsTo(MaterialCategory::class, 'material_category_id'); }
    public function supplier() { return $this->belongsTo(Supplier::class); }
    public function movements() { return $this->hasMany(InventoryMovement::class); }
    public function purchaseOrderItems() { return $this->hasMany(PurchaseOrderItem::class); }

    public function getStockStatusAttribute(): string
    {
        if ((float) $this->current_stock <= 0) return 'Out of Stock';
        if ((float) $this->current_stock <= (float) $this->minimum_stock) return 'Low Stock';
        return 'In Stock';
    }

    public function getStockValueAttribute(): float
    {
        return round((float) $this->current_stock * (float) $this->purchase_price, 2);
    }
}
