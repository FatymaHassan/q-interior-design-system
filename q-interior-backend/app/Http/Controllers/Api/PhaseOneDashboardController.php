<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Notification;
use App\Models\Project;
use App\Models\User;

class PhaseOneDashboardController extends Controller
{
    public function __invoke()
    {
        return response()->json([
            'total_clients' => Client::count(),
            'total_projects' => Project::count(),
            'active_projects' => Project::whereIn('status', ['Active', 'active', 'In Progress'])->count(),
            'completed_projects' => Project::whereIn('status', ['Completed', 'completed'])->count(),
            'total_users' => User::count(),
            'unread_notifications' => Notification::where('is_read', false)->count(),
            'recent_projects' => Project::with('client')->latest()->take(6)->get(),
            'recent_clients' => Client::latest()->take(6)->get(),
        ]);
    }
}
