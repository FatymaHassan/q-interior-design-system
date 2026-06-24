<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\Quotation;
use App\Models\QuotationApproval;
use App\Models\QuotationItem;
use App\Models\QuotationRoom;
use App\Models\QuotationSection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $this->expireOldQuotations();

        return Quotation::with(['client', 'project', 'invoice', 'sections.rooms.items', 'items', 'approvals'])
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
            ->when($request->query('search'), function ($query, $value) {
                $query->where(function ($search) use ($value) {
                    $search->where('title', 'like', "%{$value}%")
                        ->orWhere('quotation_number', 'like', "%{$value}%")
                        ->orWhereHas('client', fn ($client) => $client->where('name', 'like', "%{$value}%"));
                });
            })
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        return DB::transaction(function () use ($data, $request) {
            $items = $data['items'] ?? [];
            $sections = $data['sections'] ?? [];
            unset($data['items'], $data['sections']);

            $quotation = Quotation::create(array_merge($data, [
                'quotation_number' => $this->nextNumber('QTN'),
                'client_name' => $data['client_name'] ?? null,
                'project_title' => $data['project_title'] ?? $data['title'],
                'grand_total' => 0,
                'created_by' => $request->user()?->id,
                'updated_by' => $request->user()?->id,
                'quotation_date' => $data['quotation_date'] ?? now()->toDateString(),
            ]));

            $this->syncStructure($quotation, $sections, $items);
            $this->snapshot($quotation, 'Initial quotation', $request->user()?->id);

            Notification::create([
                'title' => 'Quotation created',
                'message' => $quotation->quotation_number . ' was created for ' . $quotation->client?->name,
                'type' => 'quotation_created',
                'link' => '/quotations/' . $quotation->id,
                'is_read' => false,
            ]);

            return $quotation->load(['client', 'project', 'sections.rooms.items', 'items', 'versions', 'attachments', 'approvals']);
        });
    }

    public function show(Quotation $quotation)
    {
        return $quotation->load(['client', 'project', 'invoice.items', 'sections.rooms.items', 'rooms.items', 'items.section', 'items.room', 'versions.creator', 'attachments.uploader', 'approvals']);
    }

    public function update(Request $request, Quotation $quotation)
    {
        abort_if($quotation->locked_at, 422, 'Approved quotations are locked. Create a revision instead.');

        $data = $this->validated($request, true);

        return DB::transaction(function () use ($data, $quotation, $request) {
            $items = $data['items'] ?? null;
            $sections = $data['sections'] ?? null;
            unset($data['items'], $data['sections']);

            $quotation->update(array_merge($data, ['updated_by' => $request->user()?->id]));

            if ($items !== null || $sections !== null) {
                $quotation->sections()->delete();
                $quotation->rooms()->delete();
                $quotation->items()->delete();
                $this->syncStructure($quotation, $sections ?? [], $items ?? []);
            }

            $this->snapshot($quotation, 'Updated quotation', $request->user()?->id);

            return $quotation->load(['client', 'project', 'sections.rooms.items', 'items', 'versions', 'attachments', 'approvals']);
        });
    }

    public function destroy(Quotation $quotation)
    {
        abort_if($quotation->status === 'Approved', 422, 'Approved quotations cannot be deleted.');
        $quotation->delete();

        return response()->json(['message' => 'Quotation deleted successfully']);
    }

    public function send(Quotation $quotation)
    {
        abort_if($quotation->status === 'Approved', 422, 'Approved quotations are already locked.');

        $quotation->update([
            'status' => 'Sent',
            'sent_at' => now(),
            'sent_by' => request()->user()?->id,
        ]);

        QuotationApproval::updateOrCreate([
            'quotation_id' => $quotation->id,
            'client_id' => $quotation->client_id,
        ], [
            'status' => 'Pending',
            'client_comment' => null,
        ]);

        Notification::create([
            'title' => 'Quotation sent',
            'message' => $quotation->quotation_number . ' is now visible in the client portal.',
            'type' => 'quotation_sent',
            'link' => '/quotations/' . $quotation->id,
            'is_read' => false,
        ]);

        return $quotation->load(['client', 'project', 'items', 'approvals']);
    }

    public function revise(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'change_notes' => 'nullable|string',
        ]);

        abort_if($quotation->status === 'Approved', 422, 'Approved quotations are locked and cannot be revised.');

        $quotation->update([
            'status' => 'Revised',
            'locked_at' => null,
        ]);
        $this->snapshot($quotation, $data['change_notes'] ?? 'Quotation revision', $request->user()?->id);

        Notification::create([
            'title' => 'Quotation revised',
            'message' => $quotation->quotation_number . ' has a new revision.',
            'type' => 'quotation_revised',
            'link' => '/quotations/' . $quotation->id,
            'is_read' => false,
        ]);

        return $quotation->load(['client', 'project', 'items', 'versions', 'approvals']);
    }

    public function versions(Quotation $quotation)
    {
        return $quotation->versions()->with('creator')->get();
    }

    public function attachment(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'file' => 'required|file|max:10240',
            'visibility' => 'nullable|in:internal,client',
        ]);

        $attachment = $quotation->attachments()->create([
            'title' => $data['title'],
            'file_path' => $request->file('file')->store('quotation-attachments', 'public'),
            'file_type' => $request->file('file')->getClientOriginalExtension(),
            'visibility' => $data['visibility'] ?? 'internal',
            'uploaded_by' => $request->user()?->id,
        ]);

        return $attachment->load('uploader');
    }

    public function convert(Request $request, Quotation $quotation)
    {
        abort_unless($quotation->status === 'Approved', 422, 'Only approved quotations can be converted.');

        return DB::transaction(function () use ($quotation, $request) {
            $this->convertApprovedQuotation($quotation, $request->user()?->id);

            return $quotation->load(['client', 'project', 'invoice.items', 'items']);
        });
    }

    public function report()
    {
        $this->expireOldQuotations();
        $quotes = Quotation::query()->get();
        $sentCount = max($quotes->whereIn('status', ['Sent', 'Approved', 'Rejected', 'Revised'])->count(), 1);
        $approvalSeconds = $quotes->filter(fn ($quote) => $quote->sent_at && $quote->approved_at)
            ->map(fn ($quote) => $quote->sent_at->diffInSeconds($quote->approved_at));

        return response()->json([
            'total' => $quotes->count(),
            'sent' => $quotes->where('status', 'Sent')->count(),
            'approved' => $quotes->where('status', 'Approved')->count(),
            'rejected' => $quotes->where('status', 'Rejected')->count(),
            'expired' => $quotes->where('status', 'Expired')->count(),
            'revised' => $quotes->where('status', 'Revised')->count(),
            'pending_response' => $quotes->whereIn('status', ['Sent', 'Revised'])->count(),
            'pipeline_value' => $quotes->whereIn('status', ['Draft', 'Sent', 'Revised'])->sum(fn ($quote) => (float) ($quote->grand_total ?: $quote->total_amount)),
            'total_value' => $quotes->sum(fn ($quote) => (float) ($quote->grand_total ?: $quote->total_amount)),
            'approved_value' => $quotes->where('status', 'Approved')->sum(fn ($quote) => (float) ($quote->grand_total ?: $quote->total_amount)),
            'conversion_rate' => round(($quotes->where('status', 'Approved')->count() / $sentCount) * 100, 2),
            'average_approval_hours' => $approvalSeconds->count() ? round($approvalSeconds->avg() / 3600, 2) : 0,
            'recent' => Quotation::with('client')->latest()->limit(5)->get(),
        ]);
    }

    public function preview(Quotation $quotation)
    {
        $token = request()->query('token') ?: str_replace('Bearer ', '', request()->header('Authorization', ''));
        abort_unless(request()->user() || ($token && PersonalAccessToken::findToken($token)), 401);

        return response($this->htmlPreview($quotation->load(['client', 'project', 'sections.rooms.items', 'items', 'approvals'])))
            ->header('Content-Type', 'text/html');
    }

    public function storeSection(Request $request, Quotation $quotation)
    {
        $section = $quotation->sections()->create($request->validate([
            'title' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]));

        return $section;
    }

    public function storeRoom(Request $request, Quotation $quotation)
    {
        $room = $quotation->rooms()->create($request->validate([
            'quotation_section_id' => 'required|exists:quotation_sections,id',
            'title' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]));

        return $room;
    }

    public function storeItem(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'quotation_section_id' => 'nullable|exists:quotation_sections,id',
            'quotation_room_id' => 'nullable|exists:quotation_rooms,id',
            'description' => 'required|string|max:255',
            'unit_type' => 'nullable|string|max:255',
            'quantity' => 'nullable|numeric|min:0',
            'area_m2' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'total' => 'nullable|numeric|min:0',
            'is_manual_total' => 'nullable|boolean',
            'notes' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        $data['unit_type'] = $data['unit_type'] ?? (isset($data['area_m2']) ? 'M²' : 'Unit');
        $data['quantity'] = $data['quantity'] ?? $data['area_m2'] ?? ($data['unit_type'] === 'Lump Sum' ? 1 : 0);
        $data['area_m2'] = $data['unit_type'] === 'M²' ? $data['quantity'] : null;
        $data['unit_price'] = $data['rate'] ?? 0;
        $data['rate'] = $data['rate'] ?? $data['unit_price'];
        $data['is_manual_total'] = (bool) ($data['is_manual_total'] ?? $data['unit_type'] === 'Custom');
        $data['discount'] = (float) ($data['discount'] ?? 0);
        $data['tax'] = (float) ($data['tax'] ?? 0);
        $data['total'] = $this->calculateItemTotal($data['unit_type'], (float) $data['quantity'], (float) $data['rate'], (float) ($data['total'] ?? 0), $data['is_manual_total'], $data['discount'], $data['tax']);
        $item = $quotation->items()->create($data);
        $this->recalculateTotals($quotation);

        return $item->load(['section', 'room']);
    }

    public function updateItem(Request $request, QuotationItem $quotationItem)
    {
        $data = $request->validate([
            'description' => 'sometimes|required|string|max:255',
            'unit_type' => 'nullable|string|max:255',
            'quantity' => 'nullable|numeric|min:0',
            'area_m2' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'total' => 'nullable|numeric|min:0',
            'is_manual_total' => 'nullable|boolean',
            'notes' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        if (array_key_exists('quantity', $data) || array_key_exists('area_m2', $data) || array_key_exists('rate', $data) || array_key_exists('total', $data) || array_key_exists('unit_type', $data)) {
            $unitType = $data['unit_type'] ?? $quotationItem->unit_type ?? 'Unit';
            $quantity = (float) ($data['quantity'] ?? $data['area_m2'] ?? $quotationItem->quantity ?? 0);
            $rate = (float) ($data['rate'] ?? $quotationItem->rate ?? $quotationItem->unit_price ?? 0);
            $manual = (bool) ($data['is_manual_total'] ?? $quotationItem->is_manual_total ?? $unitType === 'Custom');
            $discount = (float) ($data['discount'] ?? $quotationItem->discount ?? 0);
            $tax = (float) ($data['tax'] ?? $quotationItem->tax ?? 0);
            $data['quantity'] = $quantity;
            $data['area_m2'] = $unitType === 'M²' ? $quantity : null;
            $data['rate'] = $rate;
            $data['unit_price'] = $rate;
            $data['discount'] = $discount;
            $data['tax'] = $tax;
            $data['total'] = $this->calculateItemTotal($unitType, $quantity, $rate, (float) ($data['total'] ?? $quotationItem->total ?? 0), $manual, $discount, $tax);
            $data['is_manual_total'] = $manual;
        }
        $quotationItem->update($data);
        $this->recalculateTotals($quotationItem->quotation);

        return $quotationItem->load(['section', 'room']);
    }

    public function destroyItem(QuotationItem $quotationItem)
    {
        $quotation = $quotationItem->quotation;
        $quotationItem->delete();
        $this->recalculateTotals($quotation);

        return response()->json(['message' => 'Quotation item deleted successfully']);
    }

    public function pdf(Request $request, Quotation $quotation)
    {
        if (! $request->user()) {
            $token = $request->query('token') ?: str_replace('Bearer ', '', $request->header('Authorization', ''));
            abort_unless($token && PersonalAccessToken::findToken($token), 401);
        }

        $quotation->load(['client', 'project', 'sections.rooms.items', 'items', 'approvals']);

        return response($this->pdfDocument($quotation))
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $quotation->quotation_number . '.pdf"');
    }

    protected function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'client_id' => ($partial ? 'sometimes|' : '') . 'required|exists:clients,id',
            'project_id' => 'nullable|exists:projects,id',
            'title' => ($partial ? 'sometimes|' : '') . 'required|string|max:255',
            'project_title' => 'nullable|string|max:255',
            'client_name' => 'nullable|string|max:255',
            'project_type' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'quotation_date' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:quotation_date',
            'payment_terms' => 'nullable|string',
            'payment_account_name' => 'nullable|string|max:255',
            'payment_bank' => 'nullable|string|max:255',
            'payment_account_no' => 'nullable|string|max:255',
            'payment_phone' => 'nullable|string|max:255',
            'payment_notes' => 'nullable|string',
            'profit_percentage' => 'nullable|numeric|min:0|max:100',
            'deposit_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'special_conditions' => 'nullable|string',
            'scope_exclusions' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'footer_note' => 'nullable|string',
            'status' => 'nullable|in:Draft,Sent,Approved,Rejected,Expired,Revised',
            'sections' => 'nullable|array',
            'sections.*.title' => 'required_with:sections|string|max:255',
            'sections.*.sort_order' => 'nullable|integer|min:0',
            'sections.*.rooms' => 'nullable|array',
            'sections.*.rooms.*.title' => 'required_with:sections.*.rooms|string|max:255',
            'sections.*.rooms.*.sort_order' => 'nullable|integer|min:0',
            'sections.*.rooms.*.items' => 'nullable|array',
            'sections.*.rooms.*.items.*.description' => 'required_with:sections.*.rooms.*.items|string|max:255',
            'sections.*.rooms.*.items.*.unit_type' => 'nullable|string|max:255',
            'sections.*.rooms.*.items.*.quantity' => 'nullable|numeric|min:0',
            'sections.*.rooms.*.items.*.area_m2' => 'nullable|numeric|min:0',
            'sections.*.rooms.*.items.*.rate' => 'nullable|numeric|min:0',
            'sections.*.rooms.*.items.*.discount' => 'nullable|numeric|min:0',
            'sections.*.rooms.*.items.*.tax' => 'nullable|numeric|min:0',
            'sections.*.rooms.*.items.*.total' => 'nullable|numeric|min:0',
            'sections.*.rooms.*.items.*.is_manual_total' => 'nullable|boolean',
            'sections.*.rooms.*.items.*.notes' => 'nullable|string',
            'items' => ($partial ? 'sometimes|' : '') . 'array|min:1',
            'items.*.description' => 'required_with:items|string|max:255',
            'items.*.unit_type' => 'nullable|string|max:255',
            'items.*.quantity' => 'nullable|numeric|min:0',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.area_m2' => 'nullable|numeric|min:0',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.total' => 'nullable|numeric|min:0',
            'items.*.is_manual_total' => 'nullable|boolean',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);
    }

    protected function syncStructure(Quotation $quotation, array $sections, array $items): void
    {
        if ($sections !== []) {
            foreach ($sections as $sectionIndex => $sectionData) {
                $section = $quotation->sections()->create([
                    'title' => $sectionData['title'],
                    'sort_order' => $sectionData['sort_order'] ?? $sectionIndex,
                ]);
                foreach (($sectionData['rooms'] ?? []) as $roomIndex => $roomData) {
                    $room = $quotation->rooms()->create([
                        'quotation_section_id' => $section->id,
                        'title' => $roomData['title'],
                        'sort_order' => $roomData['sort_order'] ?? $roomIndex,
                    ]);
                    foreach (($roomData['items'] ?? []) as $itemIndex => $item) {
                        $this->createStructuredItem($quotation, $item, $section->id, $room->id, $itemIndex);
                    }
                }
            }
        } else {
            foreach ($items as $itemIndex => $item) {
                $this->createStructuredItem($quotation, $item, null, null, $itemIndex);
            }
        }

        $this->recalculateTotals($quotation);
    }

    protected function createStructuredItem(Quotation $quotation, array $item, ?int $sectionId, ?int $roomId, int $sortOrder): void
    {
        $unitType = $item['unit_type'] ?? (isset($item['area_m2']) ? 'M²' : 'Unit');
        $quantity = (float) ($item['quantity'] ?? $item['area_m2'] ?? ($unitType === 'Lump Sum' ? 1 : 0));
        $rate = (float) ($item['rate'] ?? $item['unit_price'] ?? 0);
        $discount = (float) ($item['discount'] ?? 0);
        $tax = (float) ($item['tax'] ?? 0);
        $manualTotal = (bool) ($item['is_manual_total'] ?? $unitType === 'Custom');
        $total = $this->calculateItemTotal($unitType, $quantity, $rate, (float) ($item['total'] ?? 0), $manualTotal, $discount, $tax);

        $quotation->items()->create([
            'quotation_section_id' => $sectionId,
            'quotation_room_id' => $roomId,
            'description' => $item['description'],
            'unit_type' => $unitType,
            'area_m2' => $unitType === 'M²' ? $quantity : null,
            'rate' => $rate,
            'quantity' => $quantity,
            'unit_price' => $rate,
            'discount' => $discount,
            'tax' => $tax,
            'total' => $total,
            'is_manual_total' => $manualTotal,
            'notes' => $item['notes'] ?? null,
            'sort_order' => $item['sort_order'] ?? $sortOrder,
        ]);
    }

    protected function calculateItemTotal(string $unitType, float $quantity, float $rate, float $manualTotal, bool $manual, float $discount = 0, float $tax = 0): float
    {
        if ($manual || $unitType === 'Custom') {
            return max($manualTotal - $discount + $tax, 0);
        }

        if ($unitType === 'Lump Sum') {
            return max(($manualTotal > 0 ? $manualTotal : $rate) - $discount + $tax, 0);
        }

        return max(($quantity * $rate) - $discount + $tax, 0);
    }

    protected function recalculateTotals(Quotation $quotation): void
    {
        $subtotal = (float) $quotation->items()->sum('total');
        $discount = (float) $quotation->items()->sum('discount');
        $tax = (float) $quotation->items()->sum('tax');
        $profit = round($subtotal * (float) ($quotation->profit_percentage ?? 0) / 100, 2);
        $quotation->update([
            'subtotal' => $subtotal,
            'total_discount' => $discount,
            'total_tax' => $tax,
            'discount' => $discount,
            'tax' => $tax,
            'profit_amount' => $profit,
            'total_amount' => $subtotal + $profit,
            'grand_total' => $subtotal + $profit,
        ]);
    }

    public function convertApprovedQuotation(Quotation $quotation, ?int $userId = null): Quotation
    {
        $quotation->loadMissing(['items', 'project', 'invoice']);

        $project = $quotation->project ?: Project::create([
            'client_id' => $quotation->client_id,
            'project_stage_id' => ProjectStage::where('name', 'Inquiry')->value('id'),
            'name' => $quotation->project_title ?: $quotation->title,
            'project_name' => $quotation->project_title ?: $quotation->title,
            'location' => $quotation->location,
            'budget' => $quotation->grand_total ?: $quotation->total_amount,
            'status' => 'Pending',
            'description' => $quotation->notes,
            'notes' => $quotation->special_conditions,
            'created_by' => $userId,
        ]);

        $invoiceTotal = $quotation->deposit_percentage
            ? round(((float) ($quotation->grand_total ?: $quotation->total_amount) * (float) $quotation->deposit_percentage) / 100, 2)
            : (float) ($quotation->grand_total ?: $quotation->total_amount);

        $invoice = $quotation->invoice ?: Invoice::create([
            'invoice_number' => $this->nextNumber('INV', Invoice::class, 'invoice_number'),
            'client_id' => $quotation->client_id,
            'project_id' => $project->id,
            'quotation_id' => $quotation->id,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'subtotal' => $quotation->subtotal,
            'discount' => $quotation->total_discount ?: $quotation->discount,
            'tax' => $quotation->total_tax ?: $quotation->tax,
            'total_amount' => $invoiceTotal,
            'notes' => 'Generated from quotation ' . $quotation->quotation_number,
            'created_by' => $userId,
        ]);

        if ($invoice->items()->count() === 0) {
            foreach ($quotation->items as $item) {
                $invoice->items()->create([
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total' => $item->total,
                ]);
            }
        }

        $quotation->update(['project_id' => $project->id, 'invoice_id' => $invoice->id]);

        Notification::create([
            'project_id' => $project->id,
            'title' => 'Quotation converted',
            'message' => $quotation->quotation_number . ' was converted to a project and invoice.',
            'type' => 'quotation_converted',
            'link' => '/projects/' . $project->id,
            'is_read' => false,
        ]);

        return $quotation->refresh();
    }

    protected function snapshot(Quotation $quotation, string $notes, ?int $userId): void
    {
        $quotation->refresh();
        $quotation->versions()->create([
            'version_number' => $quotation->versions()->count() + 1,
            'subtotal' => $quotation->subtotal,
            'total_discount' => $quotation->total_discount,
            'total_tax' => $quotation->total_tax,
            'discount' => $quotation->discount,
            'tax' => $quotation->tax,
            'profit_percentage' => $quotation->profit_percentage,
            'profit_amount' => $quotation->profit_amount,
            'total_amount' => $quotation->total_amount,
            'grand_total' => $quotation->grand_total ?: $quotation->total_amount,
            'change_notes' => $notes,
            'status' => $quotation->status,
            'created_by' => $userId,
        ]);
    }

    protected function nextNumber(string $prefix, string $model = Quotation::class, string $column = 'quotation_number'): string
    {
        $count = $model::where($column, 'like', $prefix . '-' . now()->format('Y') . '-%')->count() + 1;

        return $prefix . '-' . now()->format('Y') . '-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    protected function expireOldQuotations(): void
    {
        Quotation::whereIn('status', ['Draft', 'Sent', 'Revised'])
            ->whereDate('valid_until', '<', now()->toDateString())
            ->update(['status' => 'Expired']);
    }

    protected function pdfDocument(Quotation $quotation): string
    {
        $content = [];
        $logoPath = public_path('images/q-interior-logo.jpeg');
        $logo = is_file($logoPath) ? file_get_contents($logoPath) : null;
        $this->drawQuotationPage($content, $quotation, (bool) $logo);

        return $this->buildPdf(implode("\n", $content), $logo);
    }

    protected function drawQuotationPage(array &$content, Quotation $quotation, bool $hasLogo = false): void
    {
        if ($hasLogo) {
            $content[] = 'q 82 0 0 82 42 748 cm /Im1 Do Q';
        }

        $this->pdfText($content, 'Q INTERIOR DESIGN STUDIO', $hasLogo ? 140 : 174, 790, 16, true);
        $this->pdfText($content, 'Mogadishu, Somalia  |  +252 61 0000000', $hasLogo ? 140 : 190, 772, 9);
        $this->line($content, 42, 758, 553, 758);
        $this->pdfText($content, 'QUOTATION', 244, 730, 22, true);
        $this->line($content, 42, 712, 553, 712);

        $this->pdfText($content, 'PROJECT: ' . ($quotation->project_title ?: $quotation->title), 42, 684, 11, true);
        $this->pdfText($content, 'Client Name: ' . ($quotation->client_name ?: $quotation->client?->name ?: '-'), 42, 666, 10);
        $this->pdfText($content, 'Location: ' . ($quotation->location ?: $quotation->project?->location ?: '-'), 42, 648, 10);
        $this->pdfText($content, 'Date: ' . ($quotation->quotation_date?->format('d-m-Y') ?? now()->format('d-m-Y')), 430, 648, 10);

        $y = 610;
        $this->rect($content, 42, $y, 511, 22, '0.10 0.12 0.16 rg');
        $this->pdfText($content, 'Description / Scope of Work', 48, $y + 7, 9, true, '1 1 1 rg');
        $this->pdfText($content, 'Qty / Unit', 306, $y + 7, 9, true, '1 1 1 rg');
        $this->pdfText($content, 'Rate', 364, $y + 7, 9, true, '1 1 1 rg');
        $this->pdfText($content, 'Disc', 408, $y + 7, 9, true, '1 1 1 rg');
        $this->pdfText($content, 'Tax', 450, $y + 7, 9, true, '1 1 1 rg');
        $this->pdfText($content, 'Total', 488, $y + 7, 9, true, '1 1 1 rg');
        $this->pdfText($content, 'Notes', 535, $y + 7, 8, true, '1 1 1 rg');
        $y -= 20;

        $hasSections = $quotation->sections->isNotEmpty();
        if ($hasSections) {
            foreach ($quotation->sections as $section) {
                $this->rect($content, 42, $y, 511, 18, '0.86 0.86 0.86 rg');
                $this->pdfText($content, strtoupper($section->title), 48, $y + 5, 9, true);
                $y -= 18;
                foreach ($section->rooms as $roomIndex => $room) {
                    $this->rect($content, 42, $y, 511, 18, '0.94 0.94 0.94 rg');
                    $this->pdfText($content, ($roomIndex + 1) . '. ' . $room->title, 56, $y + 5, 9, true);
                    $y -= 18;
                    foreach ($room->items as $item) {
                        $this->scopeRow($content, $item, $y);
                        $y -= 18;
                        if ($y < 145) {
                            break 3;
                        }
                    }
                }
            }
        } else {
            foreach ($quotation->items as $item) {
                $this->scopeRow($content, $item, $y);
                $y -= 18;
                if ($y < 145) {
                    break;
                }
            }
        }

        $profitLabel = 'Profit ' . number_format((float) $quotation->profit_percentage, 2) . '%';
        $this->pdfText($content, 'Subtotal', 342, 132, 10, true);
        $this->pdfText($content, '$' . number_format((float) $quotation->subtotal, 2), 430, 132, 10, true);
        $this->pdfText($content, $profitLabel, 342, 112, 10, true);
        $this->pdfText($content, '$' . number_format((float) $quotation->profit_amount, 2), 430, 112, 10, true);
        $this->rect($content, 326, 82, 227, 24, '0.10 0.12 0.16 rg');
        $this->pdfText($content, 'GRAND TOTAL', 342, 90, 11, true, '1 1 1 rg');
        $this->pdfText($content, '$' . number_format((float) ($quotation->grand_total ?: $quotation->total_amount), 2), 430, 90, 11, true, '1 1 1 rg');

        $this->pdfText($content, 'PAYMENT TERMS', 42, 112, 9, true);
        $this->multiline($content, $quotation->payment_terms ?: "60% advance upon agreement\n30% upon progress payment\n10% final payment", 42, 96, 8, 3);
        $this->pdfText($content, 'PAYMENT DETAILS', 42, 55, 9, true);
        $this->pdfText($content, 'Account Name: ' . ($quotation->payment_account_name ?: '________________________'), 42, 40, 8);
        $this->pdfText($content, 'Bank: ' . ($quotation->payment_bank ?: '____________________________'), 42, 28, 8);
        $this->pdfText($content, 'Account No: ' . ($quotation->payment_account_no ?: '________________________'), 250, 28, 8);
        $this->pdfText($content, 'APPROVAL  Client Signature: ____________________  Date: ____________________', 250, 55, 8, true);
        $this->pdfText($content, $quotation->footer_note ?: 'Thank you for considering Q INTERIOR DESIGN STUDIO. We look forward to working with you!', 122, 12, 8);
    }

    protected function scopeRow(array &$content, QuotationItem $item, int $y): void
    {
        $this->line($content, 42, $y, 553, $y);
        $this->pdfText($content, mb_strimwidth($item->description, 0, 48, '...'), 48, $y + 5, 8);
        $this->pdfText($content, $this->formatQuantityUnit($item), 306, $y + 5, 8);
        $this->pdfText($content, '$' . number_format((float) ($item->rate ?: $item->unit_price), 2), 364, $y + 5, 8);
        $this->pdfText($content, '$' . number_format((float) $item->discount, 2), 408, $y + 5, 8);
        $this->pdfText($content, '$' . number_format((float) $item->tax, 2), 450, $y + 5, 8);
        $this->pdfText($content, '$' . number_format((float) $item->total, 2), 488, $y + 5, 8);
        $this->pdfText($content, mb_strimwidth($item->notes ?: '', 0, 10, '...'), 535, $y + 5, 7);
    }

    protected function htmlPreview(Quotation $quotation): string
    {
        $rows = '';
        foreach ($quotation->sections as $section) {
            $rows .= '<tr class="section"><td colspan="5">' . e(strtoupper($section->title)) . '</td></tr>';
            foreach ($section->rooms as $index => $room) {
                $rows .= '<tr class="room"><td colspan="5">' . ($index + 1) . '. ' . e($room->title) . '</td></tr>';
                foreach ($room->items as $item) {
                    $rows .= '<tr><td>' . e($item->description) . '</td><td>' . e($this->formatQuantityUnit($item)) . '</td><td>$' . number_format((float) ($item->rate ?: $item->unit_price), 2) . '</td><td>$' . number_format((float) $item->discount, 2) . '</td><td>$' . number_format((float) $item->tax, 2) . '</td><td>$' . number_format((float) $item->total, 2) . '</td><td>' . e($item->notes) . '</td></tr>';
                }
            }
        }
        if ($rows === '') {
            foreach ($quotation->items as $item) {
                $rows .= '<tr><td>' . e($item->description) . '</td><td>' . e($this->formatQuantityUnit($item)) . '</td><td>$' . number_format((float) ($item->rate ?: $item->unit_price), 2) . '</td><td>$' . number_format((float) $item->discount, 2) . '</td><td>$' . number_format((float) $item->tax, 2) . '</td><td>$' . number_format((float) $item->total, 2) . '</td><td>' . e($item->notes) . '</td></tr>';
            }
        }

        return '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:34px;color:#161a22}.center{text-align:center}.line{border-top:1px solid #333;margin:14px 0}h1{font-size:32px;letter-spacing:2px}table{width:100%;border-collapse:collapse;margin-top:22px;font-size:13px}th{background:#151923;color:white;padding:10px;text-align:left}td{border:1px solid #ccc;padding:8px}.section td{background:#d9d9d9;font-weight:700}.room td{background:#efefef;font-weight:700}.total{background:#151923;color:white;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}.footer{text-align:center;font-style:italic;margin-top:30px}</style></head><body><div class="center"><h2>Q INTERIOR DESIGN STUDIO</h2><p>Mogadishu, Somalia | +252 61 0000000</p></div><div class="line"></div><h1 class="center">QUOTATION</h1><div class="line"></div><p><b>PROJECT:</b> ' . e($quotation->project_title ?: $quotation->title) . '</p><p><b>Client Name:</b> ' . e($quotation->client_name ?: $quotation->client?->name) . '</p><p><b>Location:</b> ' . e($quotation->location ?: $quotation->project?->location) . '</p><p><b>Date:</b> ' . e($quotation->quotation_date?->format('d-m-Y')) . '</p><table><thead><tr><th>Description / Scope of Work</th><th>Qty / Unit</th><th>Rate ($)</th><th>Discount</th><th>VAT/Tax</th><th>Total ($)</th><th>Notes</th></tr></thead><tbody>' . $rows . '<tr><td colspan="5"><b>Profit ' . number_format((float) $quotation->profit_percentage, 2) . '%</b></td><td colspan="2"><b>$' . number_format((float) $quotation->profit_amount, 2) . '</b></td></tr><tr class="total"><td colspan="5">GRAND TOTAL</td><td colspan="2">$' . number_format((float) ($quotation->grand_total ?: $quotation->total_amount), 2) . '</td></tr></tbody></table><div class="grid"><div><h3>PAYMENT TERMS</h3><p>' . nl2br(e($quotation->payment_terms)) . '</p><h3>PAYMENT DETAILS</h3><p>Account Name: ' . e($quotation->payment_account_name ?: '________________') . '<br>Bank: ' . e($quotation->payment_bank ?: '________________') . '<br>Account No: ' . e($quotation->payment_account_no ?: '________________') . '<br>Phone: ' . e($quotation->payment_phone ?: '________________') . '<br>' . nl2br(e($quotation->payment_notes ?: '')) . '</p></div><div><h3>TERMS & CONDITIONS</h3><p>' . nl2br(e($quotation->terms_conditions)) . '</p><h3>APPROVAL</h3><p>Client Signature: ____________________<br>Date: ____________________</p></div></div><p class="footer">' . e($quotation->footer_note ?: 'Thank you for considering Q INTERIOR DESIGN STUDIO. We look forward to working with you!') . '</p></body></html>';
    }

    protected function formatQuantityUnit(QuotationItem $item): string
    {
        $unit = $item->unit_type ?: ($item->area_m2 ? 'M²' : 'Unit');
        if ($unit === 'Lump Sum') {
            return 'Lump Sum';
        }

        $quantity = (float) ($item->quantity ?: $item->area_m2 ?: 0);
        $label = match ($unit) {
            'Piece' => abs($quantity - 1) < 0.001 ? 'Piece' : 'Pieces',
            default => $unit,
        };

        return rtrim(rtrim(number_format($quantity, 2), '0'), '.') . ' ' . $label;
    }

    protected function pdfText(array &$content, string $text, int $x, int $y, int $size = 10, bool $bold = false, string $color = '0.10 0.12 0.16 rg'): void
    {
        $font = $bold ? '/F2' : '/F1';
        $content[] = 'BT ' . $font . ' ' . $size . ' Tf ' . $color . ' ' . $x . ' ' . $y . ' Td (' . $this->pdfEscape($text) . ') Tj ET';
    }

    protected function line(array &$content, int $x1, int $y1, int $x2, int $y2): void
    {
        $content[] = '0.45 0.45 0.45 RG ' . $x1 . ' ' . $y1 . ' m ' . $x2 . ' ' . $y2 . ' l S';
    }

    protected function rect(array &$content, int $x, int $y, int $w, int $h, string $fill): void
    {
        $content[] = $fill . ' ' . $x . ' ' . $y . ' ' . $w . ' ' . $h . ' re f';
    }

    protected function multiline(array &$content, string $text, int $x, int $y, int $size, int $lines): void
    {
        foreach (array_slice(preg_split('/\r\n|\r|\n/', $text), 0, $lines) as $index => $line) {
            $this->pdfText($content, $line, $x, $y - ($index * 12), $size);
        }
    }

    protected function pdfEscape(string $text): string
    {
        $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);

        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text ?: '');
    }

    protected function buildPdf(string $pageContent, ?string $logo): string
    {
        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> ' . ($logo ? '/XObject << /Im1 7 0 R >>' : '') . ' >> /Contents 6 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
            '6 0 obj << /Length ' . strlen($pageContent) . " >> stream\n" . $pageContent . "\nendstream endobj",
        ];

        if ($logo) {
            $objects[] = '7 0 obj << /Type /XObject /Subtype /Image /Width 500 /Height 500 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' . strlen($logo) . " >> stream\n" . $logo . "\nendstream endobj";
        }

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
        for ($index = 1; $index <= count($objects); $index++) {
            $pdf .= str_pad((string) $offsets[$index], 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }
        $pdf .= "trailer << /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";

        return $pdf;
    }
}
