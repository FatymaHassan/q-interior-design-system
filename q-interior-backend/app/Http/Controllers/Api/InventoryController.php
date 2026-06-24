<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function overview()
    {
        $materials = Material::with(['category', 'supplier'])->get();

        return response()->json([
            'total_materials' => $materials->count(),
            'low_stock_materials' => $materials->where('stock_status', 'Low Stock')->count(),
            'out_of_stock_materials' => $materials->where('stock_status', 'Out of Stock')->count(),
            'total_suppliers' => Supplier::count(),
            'pending_purchase_orders' => PurchaseOrder::whereIn('status', ['Draft', 'Ordered', 'Partially Received'])->count(),
            'received_purchase_orders_this_month' => PurchaseOrder::where('status', 'Received')->whereMonth('received_date', now()->month)->whereYear('received_date', now()->year)->count(),
            'total_inventory_value' => $materials->sum('stock_value'),
            'supplier_outstanding_balance' => Supplier::sum('current_balance'),
            'low_stock' => $materials->whereIn('stock_status', ['Low Stock', 'Out of Stock'])->values(),
            'recent_movements' => InventoryMovement::with(['material', 'project', 'supplier'])->latest()->limit(8)->get(),
            'pending_purchase_orders_list' => PurchaseOrder::with('supplier')->whereIn('status', ['Draft', 'Ordered', 'Partially Received'])->latest()->limit(8)->get(),
            'stock_value_by_category' => MaterialCategory::with('materials')->get()->map(fn ($category) => ['name' => $category->name, 'value' => $category->materials->sum('stock_value')]),
        ]);
    }

    public function categories()
    {
        return MaterialCategory::withCount('materials')->latest()->get();
    }

    public function storeCategory(Request $request)
    {
        return MaterialCategory::create($request->validate(['name' => 'required|string|max:255|unique:material_categories,name', 'description' => 'nullable|string', 'status' => 'nullable|in:Active,Inactive']));
    }

    public function updateCategory(Request $request, MaterialCategory $materialCategory)
    {
        $materialCategory->update($request->validate(['name' => 'sometimes|required|string|max:255|unique:material_categories,name,' . $materialCategory->id, 'description' => 'nullable|string', 'status' => 'nullable|in:Active,Inactive']));
        return $materialCategory;
    }

    public function destroyCategory(MaterialCategory $materialCategory)
    {
        $materialCategory->delete();
        return response()->json(['message' => 'Material category deleted']);
    }

    public function materials(Request $request)
    {
        return Material::with(['category', 'supplier'])
            ->when($request->query('category_id'), fn ($query, $value) => $query->where('material_category_id', $value))
            ->when($request->query('supplier_id'), fn ($query, $value) => $query->where('supplier_id', $value))
            ->when($request->query('search'), fn ($query, $value) => $query->where('name', 'like', "%{$value}%")->orWhere('code', 'like', "%{$value}%"))
            ->latest()
            ->get()
            ->filter(fn ($material) => ! $request->query('stock_status') || $material->stock_status === $request->query('stock_status'))
            ->values();
    }

    public function storeMaterial(Request $request)
    {
        $data = $this->materialData($request);
        $data['created_by'] = $request->user()?->id;
        $material = Material::create($data);
        $this->lowStockNotification($material);
        return $material->load(['category', 'supplier']);
    }

    public function showMaterial(Material $material)
    {
        return $material->load(['category', 'supplier', 'movements.project', 'purchaseOrderItems.purchaseOrder']);
    }

    public function updateMaterial(Request $request, Material $material)
    {
        $data = $this->materialData($request, true);
        $data['updated_by'] = $request->user()?->id;
        $material->update($data);
        $this->lowStockNotification($material);
        return $material->load(['category', 'supplier']);
    }

    public function destroyMaterial(Material $material)
    {
        $material->delete();
        return response()->json(['message' => 'Material deleted']);
    }

    public function movements(Request $request)
    {
        return InventoryMovement::with(['material.category', 'project', 'supplier', 'creator'])
            ->when($request->query('material_id'), fn ($query, $value) => $query->where('material_id', $value))
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('movement_type'), fn ($query, $value) => $query->where('movement_type', $value))
            ->latest()
            ->get();
    }

    public function showMovement(InventoryMovement $inventoryMovement)
    {
        return $inventoryMovement->load(['material', 'project', 'supplier']);
    }

    public function storeMovement(Request $request)
    {
        $data = $request->validate($this->movementRules());
        return $this->applyMovement($data, $request->user()?->id);
    }

    public function stockIn(Request $request, Material $material)
    {
        $data = $request->validate(['quantity' => 'required|numeric|min:0.01', 'unit_cost' => 'nullable|numeric|min:0', 'supplier_id' => 'nullable|exists:suppliers,id', 'notes' => 'nullable|string']);
        return $this->applyMovement($data + ['material_id' => $material->id, 'movement_type' => 'Stock In', 'movement_date' => now()->toDateString(), 'reason' => 'Stock In'], $request->user()?->id);
    }

    public function stockOut(Request $request, Material $material)
    {
        $data = $request->validate(['quantity' => 'required|numeric|min:0.01', 'unit_cost' => 'nullable|numeric|min:0', 'project_id' => 'nullable|exists:projects,id', 'notes' => 'nullable|string']);
        return $this->applyMovement($data + ['material_id' => $material->id, 'movement_type' => 'Stock Out', 'movement_date' => now()->toDateString(), 'reason' => 'Material used in project'], $request->user()?->id);
    }

    public function adjustStock(Request $request, Material $material)
    {
        $data = $request->validate(['quantity' => 'required|numeric', 'unit_cost' => 'nullable|numeric|min:0', 'reason' => 'nullable|string', 'notes' => 'nullable|string']);
        return $this->applyMovement($data + ['material_id' => $material->id, 'movement_type' => 'Adjustment', 'movement_date' => now()->toDateString()], $request->user()?->id);
    }

    public function purchaseOrders()
    {
        return PurchaseOrder::with(['supplier', 'items.material'])->latest()->get();
    }

    public function storePurchaseOrder(Request $request)
    {
        $data = $request->validate(['supplier_id' => 'required|exists:suppliers,id', 'order_date' => 'nullable|date', 'expected_delivery_date' => 'nullable|date', 'discount' => 'nullable|numeric|min:0', 'tax' => 'nullable|numeric|min:0', 'notes' => 'nullable|string', 'items' => 'required|array|min:1', 'items.*.material_id' => 'required|exists:materials,id', 'items.*.quantity_ordered' => 'required|numeric|min:0.01', 'items.*.unit_price' => 'required|numeric|min:0']);
        return DB::transaction(function () use ($data, $request) {
            $items = $data['items'];
            unset($data['items']);
            $order = PurchaseOrder::create($data + ['order_number' => $this->nextOrderNumber(), 'status' => 'Ordered', 'created_by' => $request->user()?->id, 'order_date' => $data['order_date'] ?? now()->toDateString()]);
            $subtotal = 0;
            foreach ($items as $item) {
                $total = (float) $item['quantity_ordered'] * (float) $item['unit_price'];
                $subtotal += $total;
                $order->items()->create($item + ['total' => $total]);
            }
            $order->update(['subtotal' => $subtotal, 'total_amount' => $subtotal - (float) ($data['discount'] ?? 0) + (float) ($data['tax'] ?? 0)]);
            $this->notify('Purchase order created', $order->order_number . ' was created.', 'purchase_order_created', '/inventory');
            return $order->load(['supplier', 'items.material']);
        });
    }

    public function showPurchaseOrder(PurchaseOrder $purchaseOrder)
    {
        return $purchaseOrder->load(['supplier', 'items.material', 'movements.material']);
    }

    public function updatePurchaseOrder(Request $request, PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->update($request->validate(['status' => 'nullable|in:Draft,Ordered,Partially Received,Received,Cancelled', 'expected_delivery_date' => 'nullable|date', 'discount' => 'nullable|numeric|min:0', 'tax' => 'nullable|numeric|min:0', 'notes' => 'nullable|string']));
        return $purchaseOrder->load(['supplier', 'items.material']);
    }

    public function destroyPurchaseOrder(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->delete();
        return response()->json(['message' => 'Purchase order deleted']);
    }

    public function receivePurchaseOrder(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate(['items' => 'nullable|array', 'items.*.id' => 'required|exists:purchase_order_items,id', 'items.*.quantity_received' => 'required|numeric|min:0']);
        return DB::transaction(function () use ($purchaseOrder, $data, $request) {
            $receivedAll = true;
            foreach ($purchaseOrder->items as $item) {
                $received = collect($data['items'] ?? [])->firstWhere('id', $item->id)['quantity_received'] ?? ($item->quantity_ordered - $item->quantity_received);
                $received = max((float) $received, 0);
                if ($received > 0) {
                    $item->increment('quantity_received', $received);
                    $this->applyMovement(['material_id' => $item->material_id, 'supplier_id' => $purchaseOrder->supplier_id, 'purchase_order_id' => $purchaseOrder->id, 'movement_type' => 'Stock In', 'quantity' => $received, 'unit_cost' => $item->unit_price, 'movement_date' => now()->toDateString(), 'reason' => 'Purchase order received'], $request->user()?->id);
                }
                $item->refresh();
                if ((float) $item->quantity_received < (float) $item->quantity_ordered) $receivedAll = false;
            }
            $purchaseOrder->update(['status' => $receivedAll ? 'Received' : 'Partially Received', 'received_date' => now()->toDateString()]);
            $this->recalculateSupplierBalance($purchaseOrder->supplier);
            $this->notify('Purchase order received', $purchaseOrder->order_number . ' was received.', 'purchase_order_received', '/inventory');
            return $purchaseOrder->load(['supplier', 'items.material']);
        });
    }

    public function cancelPurchaseOrder(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->update(['status' => 'Cancelled']);
        $this->notify('Purchase order cancelled', $purchaseOrder->order_number . ' was cancelled.', 'purchase_order_cancelled', '/inventory');
        return $purchaseOrder;
    }

    public function supplierBalance(Supplier $supplier)
    {
        $this->recalculateSupplierBalance($supplier);
        $purchases = $supplier->purchaseOrders()->where('status', 'Received')->sum('total_amount');
        $expenses = $supplier->expenses()->sum('amount');
        $paid = $supplier->payments()->sum('amount');
        return response()->json(['opening_balance' => (float) $supplier->opening_balance, 'total_purchases' => (float) $purchases, 'total_expenses' => (float) $expenses, 'total_paid' => (float) $paid, 'outstanding_balance' => (float) $supplier->current_balance]);
    }

    public function supplierMaterials(Supplier $supplier) { return $supplier->materials()->with('category')->get(); }
    public function supplierPurchaseOrders(Supplier $supplier) { return $supplier->purchaseOrders()->with('items.material')->latest()->get(); }
    public function projectMaterials($project) { return InventoryMovement::with(['material', 'supplier', 'creator'])->where('project_id', $project)->where('movement_type', 'Stock Out')->latest()->get(); }
    public function stockLevelsReport(Request $request) { return $this->materials($request); }
    public function lowStockReport() { return Material::with(['category', 'supplier'])->get()->filter(fn ($m) => in_array($m->stock_status, ['Low Stock', 'Out of Stock'], true))->values(); }
    public function movementsReport(Request $request) { return $this->movements($request); }
    public function projectMaterialsReport(Request $request) { return InventoryMovement::with(['material', 'project'])->whereNotNull('project_id')->where('movement_type', 'Stock Out')->latest()->get(); }
    public function supplierBalanceReport() { return Supplier::with(['purchaseOrders', 'expenses', 'payments'])->get()->map(fn ($s) => ['supplier' => $s, 'balance' => $this->supplierBalance($s)->getData(true)]); }

    private function materialData(Request $request, bool $partial = false): array
    {
        return $request->validate(['material_category_id' => 'nullable|exists:material_categories,id', 'supplier_id' => 'nullable|exists:suppliers,id', 'name' => ($partial ? 'sometimes|' : '') . 'required|string|max:255', 'code' => 'nullable|string|max:255', 'unit' => 'nullable|string|max:255', 'purchase_price' => 'nullable|numeric|min:0', 'selling_price' => 'nullable|numeric|min:0', 'current_stock' => 'nullable|numeric|min:0', 'minimum_stock' => 'nullable|numeric|min:0', 'storage_location' => 'nullable|string|max:255', 'description' => 'nullable|string', 'notes' => 'nullable|string', 'status' => 'nullable|in:Active,Inactive']);
    }

    private function movementRules(): array
    {
        return ['material_id' => 'required|exists:materials,id', 'project_id' => 'nullable|exists:projects,id', 'supplier_id' => 'nullable|exists:suppliers,id', 'purchase_order_id' => 'nullable|exists:purchase_orders,id', 'movement_type' => 'required|in:Stock In,Stock Out,Adjustment,Return,Damaged,Transfer', 'quantity' => 'required|numeric', 'unit_cost' => 'nullable|numeric|min:0', 'movement_date' => 'nullable|date', 'reason' => 'nullable|string|max:255', 'notes' => 'nullable|string'];
    }

    private function applyMovement(array $data, ?int $userId): InventoryMovement
    {
        $material = Material::findOrFail($data['material_id']);
        $quantity = (float) $data['quantity'];
        $unitCost = (float) ($data['unit_cost'] ?? $material->purchase_price);
        $direction = in_array($data['movement_type'], ['Stock In', 'Return'], true) ? 1 : -1;
        if ($data['movement_type'] === 'Adjustment') $direction = $quantity >= 0 ? 1 : -1;
        $newStock = (float) $material->current_stock + ($direction * abs($quantity));
        abort_if($newStock < 0, 422, 'Stock cannot become negative.');
        $material->update(['current_stock' => $newStock, 'purchase_price' => $unitCost ?: $material->purchase_price]);
        $movement = InventoryMovement::create($data + ['quantity' => abs($quantity), 'unit_cost' => $unitCost, 'total_cost' => abs($quantity) * $unitCost, 'movement_date' => $data['movement_date'] ?? now()->toDateString(), 'created_by' => $userId]);
        $this->lowStockNotification($material->refresh());
        if (! empty($data['project_id'])) $this->notify('Material used in project', $material->name . ' used in project.', 'material_used_in_project', '/projects/' . $data['project_id']);
        return $movement->load(['material', 'project', 'supplier']);
    }

    private function recalculateSupplierBalance(Supplier $supplier): void
    {
        $balance = (float) $supplier->opening_balance + (float) $supplier->purchaseOrders()->where('status', 'Received')->sum('total_amount') + (float) $supplier->expenses()->sum('amount') - (float) $supplier->payments()->sum('amount');
        $supplier->update(['current_balance' => $balance, 'balance' => $balance]);
    }

    private function lowStockNotification(Material $material): void
    {
        if ($material->stock_status === 'In Stock') return;
        $this->notify('Material ' . strtolower($material->stock_status), $material->name . ' is ' . $material->stock_status . '.', $material->stock_status === 'Out of Stock' ? 'material_out_of_stock' : 'material_low_stock', '/inventory');
    }

    private function nextOrderNumber(): string
    {
        return 'PO-' . now()->format('Y') . '-' . str_pad((string) (PurchaseOrder::where('order_number', 'like', 'PO-' . now()->format('Y') . '-%')->count() + 1), 4, '0', STR_PAD_LEFT);
    }

    private function notify(string $title, string $message, string $type, string $link): void
    {
        Notification::create(['title' => $title, 'message' => $message, 'type' => $type, 'link' => $link, 'is_read' => false]);
    }
}
