<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientMessage;
use App\Models\Notification;
use App\Models\Project;
use Illuminate\Http\Request;

class ClientMessageController extends Controller
{
    public function index(Request $request)
    {
        return ClientMessage::with(['project.client', 'client', 'user'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
            ->latest()
            ->get();
    }

    public function reply(Request $request, Project $project)
    {
        $data = $request->validate([
            'message' => 'required|string',
            'attachment' => 'nullable|file|max:10240',
        ]);

        if ($request->hasFile('attachment')) {
            $data['attachment'] = $request->file('attachment')->store('client-messages', 'public');
        }

        $message = ClientMessage::create([
            'project_id' => $project->id,
            'client_id' => $project->client_id,
            'user_id' => $request->user()?->id,
            'sender_type' => 'staff',
            'message' => $data['message'],
            'attachment' => $data['attachment'] ?? null,
            'is_read' => false,
        ]);

        Notification::create([
            'project_id' => $project->id,
            'title' => 'Staff replied to client',
            'message' => $data['message'],
            'type' => 'client_message_reply',
            'link' => '/client-portal',
            'is_read' => false,
        ]);

        return $message->load(['project.client', 'client', 'user']);
    }

    public function markRead(ClientMessage $message)
    {
        $message->update(['is_read' => true]);

        return $message->load(['project.client', 'client', 'user']);
    }
}
