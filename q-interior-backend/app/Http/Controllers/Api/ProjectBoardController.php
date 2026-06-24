<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectStage;
use Illuminate\Http\Request;

class ProjectBoardController extends Controller
{
    public function __invoke(Request $request)
    {
        return ProjectStage::with(['projects.client', 'projects.members.user', 'projects.members.employee.department'])
            ->with(['projects' => function ($query) use ($request) {
                $query->with(['client', 'members.user', 'members.employee.department'])
                    ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
                    ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
                    ->when($request->query('staff_id'), fn ($query, $value) => $query->whereHas('members', fn ($memberQuery) => $memberQuery->where('employee_id', $value)->orWhere('user_id', $value)))
                    ->when($request->query('search'), function ($query, $value) {
                        $query->where(function ($searchQuery) use ($value) {
                            $searchQuery->where('name', 'like', "%{$value}%")
                                ->orWhere('project_name', 'like', "%{$value}%")
                                ->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', "%{$value}%"));
                        });
                    })
                    ->latest();
            }])
            ->orderBy('order')
            ->get();
    }
}
