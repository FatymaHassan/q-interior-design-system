<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientApproval;
use App\Models\ClientMessage;
use App\Models\Document;
use App\Models\Notification;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ClientPortalController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $client = Client::where('email', $data['email'])->first();

        if (! $client || ! $client->portal_password || ! Hash::check($data['password'], $client->portal_password)) {
            return response()->json(['message' => 'Invalid client login.'], 422);
        }

        $token = Str::random(60);
        $client->update([
            'portal_token' => null,
            'portal_token_hash' => hash('sha256', $token),
            'portal_token_expires_at' => null,
            'portal_last_login_at' => now(),
        ]);

        return response()->json([
            'token' => $token,
            'client' => $client,
        ]);
    }

    public function logout(Request $request)
    {
        $client = $this->client($request);
        $client->update(['portal_token_hash' => null, 'portal_token_expires_at' => null]);

        return response()->json(['message' => 'Logged out']);
    }

    public function dashboard(Request $request)
    {
        $client = $this->client($request);

        return response()->json([
            'client' => $client,
            'projects' => Project::with(['stage', 'documents', 'approvals.signature', 'clientMessages'])
                ->where('client_id', $client->id)
                ->latest()
                ->get(),
        ]);
    }

    public function project(Request $request, Project $project)
    {
        $client = $this->client($request);
        abort_unless($project->client_id === $client->id, 403);

        return $project->load(['client', 'stage', 'documents', 'approvals.signature', 'clientMessages']);
    }

    public function timeline(Request $request, Project $project)
    {
        $client = $this->client($request);
        abort_unless($project->client_id === $client->id, 403);

        return app(ProjectController::class)->timeline($project);
    }

    public function document(Request $request, Document $document)
    {
        $client = $this->client($request);
        abort_unless($document->visibility === 'client' && $document->project?->client_id === $client->id, 403);
        abort_unless($document->file_path && Storage::disk('public')->exists($document->file_path), 404);

        return Storage::disk('public')->download($document->file_path);
    }

    public function message(Request $request)
    {
        $client = $this->client($request);
        $data = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'message' => 'required|string',
            'attachment' => 'nullable|file|max:10240',
        ]);

        $project = Project::findOrFail($data['project_id']);
        abort_unless($project->client_id === $client->id, 403);

        if ($request->hasFile('attachment')) {
            $data['attachment'] = $request->file('attachment')->store('client-messages', 'public');
        }

        $message = ClientMessage::create([
            'project_id' => $project->id,
            'client_id' => $client->id,
            'sender_type' => 'client',
            'message' => $data['message'],
            'attachment' => $data['attachment'] ?? null,
            'is_read' => false,
        ]);

        Notification::create([
            'project_id' => $project->id,
            'title' => 'Client sent message',
            'message' => $data['message'],
            'type' => 'client_message',
            'link' => '/client-messages',
            'is_read' => false,
        ]);

        return $message;
    }

    public function decide(Request $request, ClientApproval $approval, string $status)
    {
        $client = $this->client($request);
        abort_unless($approval->client_id === $client->id, 403);

        $data = $request->validate([
            'client_comment' => 'nullable|string',
            'signed_name' => 'nullable|string|max:255',
        ]);

        $approval->update([
            'status' => $status,
            'client_comment' => $data['client_comment'] ?? null,
            'approved_at' => $status === 'Approved' ? now() : null,
        ]);

        Notification::create([
            'project_id' => $approval->project_id,
            'title' => 'Client approval updated',
            'message' => $approval->title . ' - ' . $status,
            'type' => match ($status) {
                'Approved' => 'client_approved_design',
                'Rejected' => 'client_rejected_design',
                default => 'client_requested_revision',
            },
            'link' => '/projects/' . $approval->project_id,
            'is_read' => false,
        ]);

        if ($status === 'Approved' && ! empty($data['signed_name'])) {
            $approval->signature()->updateOrCreate([], [
                'client_id' => $client->id,
                'signed_name' => $data['signed_name'],
                'signed_at' => now(),
                'ip_address' => $request->ip(),
            ]);
        }

        return $approval->load('signature');
    }

    public function approve(Request $request, ClientApproval $approval)
    {
        return $this->decide($request, $approval, 'Approved');
    }

    public function reject(Request $request, ClientApproval $approval)
    {
        return $this->decide($request, $approval, 'Rejected');
    }

    public function revision(Request $request, ClientApproval $approval)
    {
        return $this->decide($request, $approval, 'Revision Requested');
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
