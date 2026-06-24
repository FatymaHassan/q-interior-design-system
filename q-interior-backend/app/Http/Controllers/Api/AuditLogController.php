<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        return AuditLog::with('user:id,name,email')
            ->when($request->filled('module'), fn ($query) => $query->where('module', $request->module))
            ->when($request->filled('action'), fn ($query) => $query->where('action', $request->action))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = '%' . $request->search . '%';
                $query->where(fn ($inner) => $inner->where('action', 'like', $search)->orWhere('module', 'like', $search)->orWhere('record_type', 'like', $search));
            })
            ->latest('created_at')
            ->limit(300)
            ->get();
    }
}
