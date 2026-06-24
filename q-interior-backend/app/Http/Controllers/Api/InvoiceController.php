<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Notification;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        return Invoice::with(['client', 'project', 'items'])
            ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('overdue'), fn ($query) => $query->whereDate('due_date', '<', now())->where('status', '!=', 'Paid'))
            ->latest()
            ->get()
            ->map(fn ($invoice) => $this->withComputedStatus($invoice));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        return DB::transaction(function () use ($data, $request) {
            $items = $data['items'] ?? [];
            unset($data['items']);

            $invoice = Invoice::create([
                ...$data,
                'invoice_number' => $data['invoice_number'] ?? $this->nextInvoiceNumber(),
                'invoice_date' => $data['invoice_date'] ?? now()->toDateString(),
                'created_by' => $request->user()?->id,
            ]);

            $this->syncItems($invoice, $items);

            return $this->withComputedStatus($invoice->load(['client', 'project', 'items']));
        });
    }

    public function show(Invoice $invoice)
    {
        return $this->withComputedStatus($invoice->load(['client', 'project', 'items']));
    }

    public function update(Request $request, Invoice $invoice)
    {
        $data = $this->validated($request, true);

        return DB::transaction(function () use ($data, $invoice) {
            $items = $data['items'] ?? null;
            unset($data['items']);

            $invoice->update($data);
            if (is_array($items)) {
                $this->syncItems($invoice, $items);
            }

            return $this->withComputedStatus($invoice->load(['client', 'project', 'items']));
        });
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted successfully']);
    }

    public function sendReminder(Invoice $invoice)
    {
        Notification::create([
            'project_id' => $invoice->project_id,
            'title' => 'Invoice reminder queued',
            'message' => $invoice->invoice_number . ' reminder for ' . ($invoice->client?->name ?? 'client') . ' is ready to send.',
            'type' => 'invoice_reminder',
            'priority' => $invoice->due_date && $invoice->due_date->isPast() ? 'high' : 'normal',
            'module' => 'finance',
            'link' => '/invoices',
            'is_read' => false,
        ]);

        return $this->withComputedStatus($invoice->load(['client', 'project', 'items']));
    }

    public function pdf(Invoice $invoice)
    {
        $invoice->load(['client', 'project', 'items']);

        return response($this->simplePdf($invoice))
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $invoice->invoice_number . '.pdf"');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'invoice_number' => 'nullable|string|max:255',
            'client_id' => [$partial ? 'sometimes' : 'required', 'exists:clients,id'],
            'project_id' => 'nullable|exists:projects,id',
            'quotation_id' => 'nullable|exists:quotations,id',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:Unpaid,Partially Paid,Paid,Overdue',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.description' => 'required_with:items|string|max:255',
            'items.*.quantity' => 'nullable|numeric|min:0',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);
    }

    private function syncItems(Invoice $invoice, array $items): void
    {
        $invoice->items()->delete();

        $subtotal = 0;
        foreach ($items as $item) {
            $quantity = (float) ($item['quantity'] ?? 1);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            $total = round($quantity * $unitPrice, 2);
            $subtotal += $total;

            $invoice->items()->create([
                'description' => $item['description'],
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total' => $total,
            ]);
        }

        $discount = (float) ($invoice->discount ?? 0);
        $tax = (float) ($invoice->tax ?? 0);
        $invoice->update([
            'subtotal' => round($subtotal, 2),
            'total_amount' => max(0, round($subtotal - $discount + $tax, 2)),
        ]);
    }

    private function withComputedStatus(Invoice $invoice): Invoice
    {
        if ($invoice->due_date && $invoice->due_date->isPast() && ! in_array($invoice->status, ['Paid', 'Overdue'], true)) {
            $invoice->forceFill(['status' => 'Overdue'])->save();
        }

        return $invoice;
    }

    private function nextInvoiceNumber(): string
    {
        $prefix = Setting::where('key', 'invoice_prefix')->value('value') ?: 'INV-';
        $next = (int) Invoice::max('id') + 1;

        return $prefix . str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    private function simplePdf(Invoice $invoice): string
    {
        $content = [];
        $this->pdfText($content, 'Q INTERIOR DESIGN STUDIO', 42, 790, 16, true);
        $this->pdfText($content, 'INVOICE ' . $invoice->invoice_number, 42, 760, 14, true);
        $this->pdfText($content, 'Client: ' . ($invoice->client?->name ?? '-'), 42, 730);
        $this->pdfText($content, 'Project: ' . ($invoice->project?->name ?: $invoice->project?->project_name ?: '-'), 42, 712);
        $this->pdfText($content, 'Invoice Date: ' . optional($invoice->invoice_date)->toDateString(), 340, 730);
        $this->pdfText($content, 'Due Date: ' . optional($invoice->due_date)->toDateString(), 340, 712);

        $y = 672;
        foreach ($invoice->items as $item) {
            $this->pdfText($content, $item->description, 42, $y);
            $this->pdfText($content, number_format((float) $item->quantity, 2), 300, $y);
            $this->pdfText($content, '$' . number_format((float) $item->unit_price, 2), 370, $y);
            $this->pdfText($content, '$' . number_format((float) $item->total, 2), 460, $y);
            $y -= 20;
        }

        $this->pdfText($content, 'Subtotal: $' . number_format((float) $invoice->subtotal, 2), 360, $y - 20, 10, true);
        $this->pdfText($content, 'Discount: $' . number_format((float) $invoice->discount, 2), 360, $y - 40);
        $this->pdfText($content, 'Tax: $' . number_format((float) $invoice->tax, 2), 360, $y - 60);
        $this->pdfText($content, 'Total: $' . number_format((float) $invoice->total_amount, 2), 360, $y - 84, 12, true);
        $this->pdfText($content, 'Status: ' . $invoice->status, 42, $y - 84, 10, true);

        return $this->buildPdf(implode("\n", $content));
    }

    private function pdfText(array &$content, string $text, int $x, int $y, int $size = 10, bool $bold = false): void
    {
        $content[] = 'BT ' . ($bold ? '/F2' : '/F1') . ' ' . $size . ' Tf 0.10 0.12 0.16 rg ' . $x . ' ' . $y . ' Td (' . $this->pdfEscape($text) . ') Tj ET';
    }

    private function pdfEscape(string $text): string
    {
        $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text ?: '');
    }

    private function buildPdf(string $pageContent): string
    {
        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
            '6 0 obj << /Length ' . strlen($pageContent) . " >> stream\n" . $pageContent . "\nendstream endobj",
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= str_pad((string) $offsets[$i], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        return $pdf . "trailer << /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
    }
}
