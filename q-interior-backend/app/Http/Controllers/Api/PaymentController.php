<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\ProjectFinanceService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type') ?? $request->route('type');

        return Payment::with(['project', 'client', 'supplier', 'invoice'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
            ->when($request->query('supplier_id'), fn ($query, $value) => $query->where('supplier_id', $value))
            ->when($request->query('invoice_id'), fn ($query, $value) => $query->where('invoice_id', $value))
            ->when($type, fn ($query, $value) => $query->where('type', $value))
            ->when($request->query('payment_method'), fn ($query, $value) => $query->where('payment_method', $value))
            ->when($request->query('month'), fn ($query, $value) => $query->whereMonth('payment_date', $value))
            ->when($request->query('year'), fn ($query, $value) => $query->whereYear('payment_date', $value))
            ->when($request->query('date_from'), fn ($query, $value) => $query->whereDate('payment_date', '>=', $value))
            ->when($request->query('date_to'), fn ($query, $value) => $query->whereDate('payment_date', '<=', $value))
            ->latest()
            ->get();
    }

    public function store(Request $request, ProjectFinanceService $finance)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'type' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'payment_type' => 'nullable|string|max:255',
            'related_stage' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'method' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['type'] = $data['type'] ?? $request->route('type') ?? 'client';
        $data['method'] = $data['method'] ?? $data['payment_method'] ?? null;
        $data['payment_method'] = $data['payment_method'] ?? $data['method'];
        if ($request->hasFile('receipt')) {
            $data['receipt_file'] = $request->file('receipt')->store('receipts', 'public');
        }
        unset($data['receipt']);

        if ($duplicate = $this->recentDuplicate($data)) {
            return $duplicate->fresh(['project', 'client', 'supplier', 'invoice']);
        }

        $payment = Payment::create($data);
        $this->refreshRelated($payment, $finance);

        return $payment->fresh(['project', 'client', 'supplier', 'invoice']);
    }

    public function show(Payment $payment)
    {
        return $payment->load(['project', 'client', 'supplier', 'invoice']);
    }

    public function update(Request $request, Payment $payment, ProjectFinanceService $finance)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'type' => 'nullable|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'payment_type' => 'nullable|string|max:255',
            'related_stage' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|max:10240',
            'method' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['method'] = $data['method'] ?? $data['payment_method'] ?? $payment->method;
        $data['payment_method'] = $data['payment_method'] ?? $data['method'];
        if ($request->hasFile('receipt')) {
            $data['receipt_file'] = $request->file('receipt')->store('receipts', 'public');
        }
        unset($data['receipt']);

        $oldProject = $payment->project;
        $oldInvoice = $payment->invoice;
        $oldSupplier = $payment->supplier;
        $payment->update($data);
        foreach ([$oldInvoice, $payment->invoice] as $invoice) {
            if ($invoice) {
                $finance->refreshInvoice($invoice);
            }
        }
        foreach ([$oldProject, $payment->project] as $project) {
            if ($project) {
                $finance->refreshProject($project);
            }
        }
        foreach ([$oldSupplier, $payment->supplier] as $supplier) {
            if ($supplier) {
                $finance->refreshSupplier($supplier);
            }
        }

        return $payment->fresh(['project', 'client', 'supplier', 'invoice']);
    }

    public function destroy(Payment $payment, ProjectFinanceService $finance)
    {
        $project = $payment->project;
        $invoice = $payment->invoice;
        $supplier = $payment->supplier;
        $payment->delete();
        if ($invoice) {
            $finance->refreshInvoice($invoice);
        }
        if ($project) {
            $finance->refreshProject($project);
        }
        if ($supplier) {
            $finance->refreshSupplier($supplier);
        }

        return response()->json(['message' => 'Payment deleted successfully']);
    }

    private function refreshRelated(Payment $payment, ProjectFinanceService $finance): void
    {
        if ($payment->invoice) {
            $finance->refreshInvoice($payment->invoice);
        }
        if ($payment->project) {
            $finance->refreshProject($payment->project);
        }
        if ($payment->supplier) {
            $finance->refreshSupplier($payment->supplier);
        }
    }

    private function recentDuplicate(array $data): ?Payment
    {
        return Payment::query()
            ->where('type', $data['type'])
            ->where('amount', $data['amount'])
            ->where('status', $data['status'] ?? null)
            ->where('payment_date', $data['payment_date'] ?? null)
            ->where('project_id', $data['project_id'] ?? null)
            ->where('client_id', $data['client_id'] ?? null)
            ->where('supplier_id', $data['supplier_id'] ?? null)
            ->where('invoice_id', $data['invoice_id'] ?? null)
            ->where('payment_method', $data['payment_method'] ?? null)
            ->where('reference_number', $data['reference_number'] ?? null)
            ->where('created_at', '>=', now()->subSeconds(30))
            ->latest()
            ->first();
    }
}
