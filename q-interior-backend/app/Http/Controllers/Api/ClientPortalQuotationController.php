<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Notification;
use App\Models\Quotation;
use Illuminate\Http\Request;

class ClientPortalQuotationController extends Controller
{
    public function index(Request $request)
    {
        $client = $this->client($request);

        return Quotation::with(['items', 'project', 'approvals'])
            ->where('client_id', $client->id)
            ->whereIn('status', ['Sent', 'Approved', 'Rejected', 'Revision Requested', 'Revised'])
            ->latest()
            ->get();
    }

    public function show(Request $request, Quotation $quotation)
    {
        $client = $this->client($request);
        abort_unless($quotation->client_id === $client->id, 403);

        return $quotation->load(['client', 'project', 'items', 'attachments', 'approvals']);
    }

    public function pdf(Request $request, Quotation $quotation)
    {
        $client = $this->client($request);
        abort_unless($quotation->client_id === $client->id, 403);

        return app(QuotationController::class)->pdf($request, $quotation);
    }

    public function approve(Request $request, Quotation $quotation)
    {
        return $this->decide($request, $quotation, 'Approved');
    }

    public function reject(Request $request, Quotation $quotation)
    {
        return $this->decide($request, $quotation, 'Rejected');
    }

    public function revision(Request $request, Quotation $quotation)
    {
        return $this->decide($request, $quotation, 'Revision Requested');
    }

    protected function decide(Request $request, Quotation $quotation, string $status)
    {
        $client = $this->client($request);
        abort_unless($quotation->client_id === $client->id, 403);
        abort_if($quotation->status === 'Approved' && $status !== 'Approved', 422, 'This quotation is already approved.');

        $data = $request->validate([
            'client_comment' => 'nullable|string',
            'signed_name' => $status === 'Approved' ? 'required|string|max:255' : 'nullable|string|max:255',
        ]);

        $approval = $quotation->approvals()->updateOrCreate([
            'client_id' => $client->id,
        ], [
            'status' => $status,
            'client_comment' => $data['client_comment'] ?? null,
            'signed_name' => $data['signed_name'] ?? null,
            'signed_at' => $status === 'Approved' ? now() : null,
            'ip_address' => $request->ip(),
            'approved_at' => $status === 'Approved' ? now() : null,
            'rejected_at' => $status === 'Rejected' ? now() : null,
            'revision_requested_at' => $status === 'Revision Requested' ? now() : null,
        ]);

        $quotation->update([
            'status' => $status === 'Revision Requested' ? 'Revised' : $status,
            'approved_at' => $status === 'Approved' ? now() : null,
            'rejected_at' => $status === 'Rejected' ? now() : null,
            'locked_at' => $status === 'Approved' ? now() : null,
        ]);

        if ($status === 'Approved') {
            app(QuotationController::class)->convertApprovedQuotation($quotation);
        }

        Notification::create([
            'project_id' => $quotation->project_id,
            'title' => 'Quotation ' . strtolower($status),
            'message' => $quotation->quotation_number . ' was updated by ' . $client->name,
            'type' => 'quotation_' . strtolower(str_replace(' ', '_', $status)),
            'link' => '/quotations/' . $quotation->id,
            'is_read' => false,
        ]);

        return $quotation->load(['client', 'project', 'invoice', 'sections.rooms.items', 'items', 'approvals']);
    }

    private function client(Request $request): Client
    {
        $token = $request->query('token') ?: str_replace('Bearer ', '', $request->header('Authorization', ''));
        $client = Client::where('portal_token_hash', hash('sha256', $token))
            ->where(function ($query) {
                $query->whereNull('portal_token_expires_at')->orWhere('portal_token_expires_at', '>', now());
            })
            ->first();
        abort_unless($client, 401);

        return $client;
    }
}
