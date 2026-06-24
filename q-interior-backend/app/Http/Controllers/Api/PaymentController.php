<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        return Payment::with(['project', 'client', 'supplier'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
            ->when($request->query('payment_method'), fn ($query, $value) => $query->where('payment_method', $value))
            ->when($request->query('month'), fn ($query, $value) => $query->whereMonth('payment_date', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->whereYear('payment_date', $value))
            ->when($request->query('date_from'), fn ($query, $value) => $query->whereDate('payment_date', '>=', $value))
            ->when($request->query('date_to'), fn ($query, $value) => $query->whereDate('payment_date', '<=', $value))
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'type' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'method' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['type'] = $data['type'] ?? 'client';
        $data['method'] = $data['method'] ?? $data['payment_method'] ?? null;
        $data['payment_method'] = $data['payment_method'] ?? $data['method'];

        return Payment::create($data);
    }

    public function show(Payment $payment)
    {
        return $payment->load(['project', 'client', 'supplier']);
    }

    public function update(Request $request, Payment $payment)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'type' => 'nullable|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'method' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['method'] = $data['method'] ?? $data['payment_method'] ?? $payment->method;
        $data['payment_method'] = $data['payment_method'] ?? $data['method'];

        $payment->update($data);

        return $payment;
    }

    public function destroy(Payment $payment)
    {
        $payment->delete();

        return response()->json(['message' => 'Payment deleted successfully']);
    }
}
