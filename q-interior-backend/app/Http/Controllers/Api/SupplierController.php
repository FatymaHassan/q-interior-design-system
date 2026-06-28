<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index()
    {
        return Supplier::with(['expenses', 'payments', 'invoices', 'materials', 'purchaseOrders'])->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'payment_terms' => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
            'current_balance' => 'nullable|numeric',
            'category' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'total_orders' => 'nullable|integer|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'balance' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $data['current_balance'] = $data['current_balance'] ?? $data['opening_balance'] ?? $data['balance'] ?? 0;

        return Supplier::create($data);
    }

    public function show(Supplier $supplier)
    {
        return $supplier->load(['expenses', 'payments.invoice', 'invoices.items', 'materials', 'purchaseOrders.items.material']);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'payment_terms' => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
            'current_balance' => 'nullable|numeric',
            'category' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'total_orders' => 'nullable|integer|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'balance' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $supplier->update($data);

        return $supplier;
    }

    public function destroy(Supplier $supplier)
    {
        if (
            $supplier->expenses()->exists()
            || $supplier->payments()->exists()
            || $supplier->invoices()->exists()
            || $supplier->materials()->exists()
            || $supplier->purchaseOrders()->exists()
        ) {
            $supplier->update(['status' => 'Inactive']);

            return response()->json([
                'message' => 'Supplier has linked records, so it was deactivated instead of deleted.',
                'supplier' => $supplier->fresh(['expenses', 'payments', 'invoices', 'materials', 'purchaseOrders']),
            ]);
        }

        $supplier->delete();

        return response()->json(['message' => 'Supplier deleted successfully']);
    }

    public function expenses(Supplier $supplier)
    {
        return $supplier->expenses()->with(['project', 'categoryModel'])->latest()->get();
    }

    public function invoices(Supplier $supplier)
    {
        return $supplier->invoices()->where('invoice_type', 'supplier')->with(['project', 'items'])->latest()->get();
    }

    public function payments(Supplier $supplier)
    {
        return $supplier->payments()->supplierPayment()->with(['project', 'invoice'])->latest()->get();
    }
}
