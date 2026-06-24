<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectMember;
use Illuminate\Http\Request;

class ProjectMemberController extends Controller
{
    public function index()
    {
        return ProjectMember::with(['project', 'user', 'employee.department'])->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'employee_id' => 'nullable|exists:employees,id',
            'user_id' => 'nullable|exists:users,id',
            'role' => 'nullable|string|max:255',
            'role_on_project' => 'nullable|string|max:255',
            'assigned_at' => 'nullable|date',
            'assigned_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);
        abort_unless(! empty($data['employee_id']) || ! empty($data['user_id']), 422, 'Choose a team member or user.');
        $data['role'] = $data['role'] ?? $data['role_on_project'] ?? 'Member';
        $data['role_on_project'] = $data['role_on_project'] ?? $data['role'];
        $data['assigned_date'] = $data['assigned_date'] ?? $data['assigned_at'] ?? now()->toDateString();
        $data['assigned_at'] = $data['assigned_at'] ?? $data['assigned_date'];

        return ProjectMember::updateOrCreate(
            [
                'project_id' => $data['project_id'],
                'employee_id' => $data['employee_id'] ?? null,
                'user_id' => $data['user_id'] ?? null,
            ],
            $data
        )->load(['project', 'user', 'employee.department']);
    }

    public function show(ProjectMember $projectMember)
    {
        return $projectMember->load(['project', 'user', 'employee.department']);
    }

    public function update(Request $request, ProjectMember $projectMember)
    {
        $data = $request->validate([
            'role' => 'nullable|string|max:255',
            'role_on_project' => 'nullable|string|max:255',
            'assigned_at' => 'nullable|date',
            'assigned_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);
        $data['role'] = $data['role'] ?? $data['role_on_project'] ?? $projectMember->role;
        $data['role_on_project'] = $data['role_on_project'] ?? $data['role'];
        $data['assigned_at'] = $data['assigned_at'] ?? $data['assigned_date'] ?? $projectMember->assigned_at;

        $projectMember->update($data);

        return $projectMember->load(['project', 'user', 'employee.department']);
    }

    public function destroy(ProjectMember $projectMember)
    {
        $projectMember->delete();

        return response()->json(['message' => 'Project member removed successfully']);
    }

    public function projectIndex($project)
    {
        return ProjectMember::with(['user', 'employee.department'])
            ->where('project_id', $project)
            ->latest()
            ->get();
    }

    public function projectStore(Request $request, $project)
    {
        $request->merge(['project_id' => $project]);

        return $this->store($request);
    }

    public function projectUpdate(Request $request, $project, ProjectMember $projectMember)
    {
        abort_unless((int) $projectMember->project_id === (int) $project, 404);

        return $this->update($request, $projectMember);
    }

    public function projectDestroy($project, ProjectMember $projectMember)
    {
        abort_unless((int) $projectMember->project_id === (int) $project, 404);

        return $this->destroy($projectMember);
    }
}
