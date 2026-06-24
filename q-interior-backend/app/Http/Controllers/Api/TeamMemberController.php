<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class TeamMemberController extends Controller
{
    public function index(Request $request)
    {
        return Employee::with(['department', 'user'])
            ->when($request->query('department_id'), fn ($query, $value) => $query->where('department_id', $value))
            ->when($request->query('department'), fn ($query, $value) => $query->whereHas('department', fn ($inner) => $inner->where('name', $value)))
            ->when($request->query('position'), fn ($query, $value) => $query->where('position', $value))
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('search'), fn ($query, $value) => $query->where(function ($inner) use ($value) {
                $inner->where('name', 'like', "%{$value}%")
                    ->orWhere('email', 'like', "%{$value}%")
                    ->orWhere('phone', 'like', "%{$value}%")
                    ->orWhere('position', 'like', "%{$value}%")
                    ->orWhere('specialty', 'like', "%{$value}%");
            }))
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $employee = Employee::create($this->data($request) + [
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        return $employee->load(['department', 'user']);
    }

    public function show(Employee $teamMember)
    {
        return $teamMember->load(['department', 'user', 'projectMemberships.project']);
    }

    public function update(Request $request, Employee $teamMember)
    {
        $teamMember->update($this->data($request, true) + ['updated_by' => $request->user()?->id]);

        return $teamMember->load(['department', 'user']);
    }

    public function destroy(Employee $teamMember)
    {
        if ($teamMember->projectMemberships()->exists()) {
            $teamMember->update(['status' => 'Inactive']);

            return response()->json(['message' => 'Team member is assigned to projects, so they were deactivated.', 'team_member' => $teamMember->fresh(['department', 'user'])]);
        }

        $teamMember->delete();

        return response()->json(['message' => 'Team member deleted successfully']);
    }

    public function status(Request $request, Employee $teamMember)
    {
        $data = $request->validate(['status' => 'required|in:Active,Inactive']);
        $teamMember->update($data + ['updated_by' => $request->user()?->id]);

        return $teamMember->load(['department', 'user']);
    }

    private function data(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'name' => ($partial ? 'sometimes|' : '') . 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'position' => 'nullable|string|max:255',
            'specialty' => 'nullable|string|max:255',
            'daily_rate' => 'nullable|numeric|min:0',
            'monthly_salary' => 'nullable|numeric|min:0',
            'photo' => 'nullable|string|max:255',
            'status' => 'nullable|in:Active,Inactive',
            'notes' => 'nullable|string',
        ]);
    }
}
