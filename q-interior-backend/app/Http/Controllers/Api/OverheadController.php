<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Overhead;
use Illuminate\Http\Request;

class OverheadController extends Controller
{
    public function index(Request $request)
    {
        return Overhead::with('categoryModel')
            ->when($request->query('category_id'), fn ($query, $value) => $query->where('category_id', $value))
            ->when($request->query('payment_method'), fn ($query, $value) => $query->where('payment_method', $value))
            ->when($request->query('month'), fn ($query, $value) => $query->whereMonth('overhead_date', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->whereYear('overhead_date', $value))
            ->when($request->query('date_from'), fn ($query, $value) => $query->whereDate('overhead_date', '>=', $value))
            ->when($request->query('date_to'), fn ($query, $value) => $query->whereDate('overhead_date', '<=', $value))
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category_id' => 'nullable|exists:expense_categories,id',
            'title' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'paid_by' => 'nullable|string|max:255',
            'overhead_date' => 'nullable|date',
            'date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['title'] = $data['title'] ?? $data['description'] ?? 'Overhead';
        $data['overhead_date'] = $data['overhead_date'] ?? $data['date'] ?? null;
        if ($request->hasFile('receipt')) {
            $data['receipt_file'] = $request->file('receipt')->store('receipts', 'public');
        }
        unset($data['date'], $data['receipt']);

        return Overhead::create($data)->load('categoryModel');
    }

    public function show(Overhead $overhead)
    {
        return $overhead->load('categoryModel');
    }

    public function update(Request $request, Overhead $overhead)
    {
        $data = $request->validate([
            'category_id' => 'nullable|exists:expense_categories,id',
            'title' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'sometimes|required|numeric|min:0',
            'paid_by' => 'nullable|string|max:255',
            'overhead_date' => 'nullable|date',
            'date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['title'] = $data['title'] ?? $data['description'] ?? $overhead->title;
        $data['overhead_date'] = $data['overhead_date'] ?? $data['date'] ?? $overhead->overhead_date;
        if ($request->hasFile('receipt')) {
            $data['receipt_file'] = $request->file('receipt')->store('receipts', 'public');
        }
        unset($data['date'], $data['receipt']);

        $overhead->update($data);

        return $overhead->load('categoryModel');
    }

    public function destroy(Overhead $overhead)
    {
        $overhead->delete();

        return response()->json(['message' => 'Overhead deleted successfully']);
    }
}
