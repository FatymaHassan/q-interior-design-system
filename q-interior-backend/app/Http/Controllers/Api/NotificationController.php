<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return Notification::with('user')
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->type))
            ->when($request->filled('read'), fn ($query) => $query->where('is_read', filter_var($request->read, FILTER_VALIDATE_BOOLEAN)))
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'nullable|string|max:255',
            'priority' => 'nullable|string|max:255',
            'module' => 'nullable|string|max:255',
            'record_id' => 'nullable|integer',
            'link' => 'nullable|string|max:255',
            'is_read' => 'nullable|boolean',
        ]);

        return Notification::create($data);
    }

    public function show(Notification $notification)
    {
        return $notification;
    }

    public function update(Request $request, Notification $notification)
    {
        $data = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'title' => 'sometimes|required|string|max:255',
            'message' => 'sometimes|required|string',
            'type' => 'nullable|string|max:255',
            'priority' => 'nullable|string|max:255',
            'module' => 'nullable|string|max:255',
            'record_id' => 'nullable|integer',
            'link' => 'nullable|string|max:255',
            'is_read' => 'nullable|boolean',
        ]);

        $notification->update($data);

        return $notification;
    }

    public function markRead(Notification $notification)
    {
        $notification->update(['is_read' => true]);

        return $notification;
    }

    public function markAllRead(Request $request)
    {
        Notification::when($request->user(), fn ($query) => $query->where(fn ($inner) => $inner->whereNull('user_id')->orWhere('user_id', $request->user()->id)))
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Notifications marked as read.']);
    }

    public function destroy(Notification $notification)
    {
        $notification->delete();

        return response()->json(['message' => 'Notification deleted successfully']);
    }
}
