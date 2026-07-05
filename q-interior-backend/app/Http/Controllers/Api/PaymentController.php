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

        return Payment::with(['project', 'client', 'supplier', 'paymentStage', 'invoice'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
            ->when($request->query('supplier_id'), fn ($query, $value) => $query->where('supplier_id', $value))
            ->when($request->query('invoice_id'), fn ($query, $value) => $query->where('invoice_id', $value))
            ->when($request->query('payment_stage_id'), fn ($query, $value) => $query->where('payment_stage_id', $value))
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
            'payment_stage_id' => 'nullable|exists:project_payment_stages,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'type' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'method' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['type'] = $data['type'] ?? $request->route('type') ?? 'client';
        $data['method'] = $data['method'] ?? $data['payment_method'] ?? null;
        $data['payment_method'] = $data['payment_method'] ?? $data['method'];

        $payment = Payment::create($data);
        $this->refreshRelated($payment, $finance);

        return $payment->fresh(['project', 'client', 'supplier', 'paymentStage', 'invoice']);
    }

    public function show(Payment $payment)
    {
        return $payment->load(['project', 'client', 'supplier', 'paymentStage', 'invoice']);
    }

    public function update(Request $request, Payment $payment, ProjectFinanceService $finance)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'payment_stage_id' => 'nullable|exists:project_payment_stages,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'type' => 'nullable|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'receipt_file' => 'nullable|string|max:255',
            'method' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['method'] = $data['method'] ?? $data['payment_method'] ?? $payment->method;
        $data['payment_method'] = $data['payment_method'] ?? $data['method'];

        $oldProject = $payment->project;
        $oldInvoice = $payment->invoice;
        $oldSupplier = $payment->supplier;
        $oldStage = $payment->paymentStage;
        $payment->update($data);
        foreach ([$oldStage, $payment->paymentStage] as $stage) {
            if ($stage) {
                $finance->refreshStage($stage);
            }
        }
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

        return $payment->fresh(['project', 'client', 'supplier', 'paymentStage', 'invoice']);
    }

    public function destroy(Payment $payment, ProjectFinanceService $finance)
    {
        $project = $payment->project;
        $invoice = $payment->invoice;
        $supplier = $payment->supplier;
        $stage = $payment->paymentStage;
        $payment->delete();
        if ($stage) {
            $finance->refreshStage($stage);
        }
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
        if ($payment->paymentStage) {
            $finance->refreshStage($payment->paymentStage);
        }
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
}
