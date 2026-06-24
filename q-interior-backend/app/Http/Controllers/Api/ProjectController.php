<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        return Project::with(['client', 'stage', 'members.user', 'members.employee.department', 'documents'])
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('client_id'), fn ($query, $value) => $query->where('client_id', $value))
            ->when($request->query('staff_id'), fn ($query, $value) => $query->whereHas('members', fn ($memberQuery) => $memberQuery->where('user_id', $value)->orWhere('employee_id', $value)))
            ->when($request->query('search'), function ($query, $value) {
                $query->where(function ($searchQuery) use ($value) {
                    $searchQuery->where('name', 'like', "%{$value}%")
                        ->orWhere('project_name', 'like', "%{$value}%")
                        ->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', "%{$value}%"));
                });
            })
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'project_stage_id' => 'nullable|exists:project_stages,id',
            'name' => 'required|string|max:255',
            'project_name' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
            'budget' => 'nullable|numeric|min:0',
            'revenue' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
            'progress' => 'nullable|integer|min:0|max:100',
            'status' => 'nullable|in:Pending,Active,Completed,Cancelled,pending,active,completed,cancelled,In Progress,Delayed',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $data['project_name'] = $data['name'];

        return Project::create($data);
    }

    public function show(Project $project)
    {
        $project->load(['client', 'stage', 'members.user.roles', 'members.employee.department', 'documents.uploader', 'tasks.assignee', 'tasks.assigner', 'tasks.statusHistories.changer', 'tasks.attachments.uploader', 'clientMessages.client', 'clientMessages.user', 'approvals.signature']);

        return $project;
    }

    public function update(Request $request, Project $project)
    {
        $data = $request->validate([
            'client_id' => 'sometimes|required|exists:clients,id',
            'project_stage_id' => 'nullable|exists:project_stages,id',
            'name' => 'nullable|string|max:255',
            'project_name' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'deadline' => 'nullable|date',
            'budget' => 'nullable|numeric|min:0',
            'revenue' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
            'progress' => 'nullable|integer|min:0|max:100',
            'status' => 'nullable|in:Pending,Active,Completed,Cancelled,pending,active,completed,cancelled,In Progress,Delayed',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        if (isset($data['name'])) {
            $data['project_name'] = $data['name'];
        }

        $project->update($data);

        return $project;
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return response()->json(['message' => 'Project deleted successfully']);
    }

    public function stage(Request $request, Project $project)
    {
        $data = $request->validate(['project_stage_id' => 'required|exists:project_stages,id']);
        $oldStage = $project->stage?->name;
        $project->update($data);
        $project->load('stage');

        Notification::create([
            'project_id' => $project->id,
            'title' => 'Project stage changed',
            'message' => ($project->name ?: $project->project_name) . ' moved from ' . ($oldStage ?: 'No stage') . ' to ' . ($project->stage?->name ?: 'No stage'),
            'type' => 'project_stage_changed',
            'link' => '/projects/' . $project->id,
            'is_read' => false,
        ]);

        return $project->load(['client', 'stage', 'members.user', 'members.employee.department']);
    }

    public function timeline(Project $project)
    {
        $project->load(['stage', 'tasks.assignee', 'tasks.statusHistories.changer', 'documents.uploader', 'clientMessages.client', 'approvals.signature']);

        return response()->json([
            'project' => $project,
            'items' => collect()
                ->merge($project->tasks->map(fn ($task) => [
                    'type' => 'task',
                    'title' => $task->title,
                    'date' => $task->completed_at ?? $task->deadline ?? $task->created_at,
                    'status' => $task->status,
                ]))
                ->merge($project->tasks->flatMap(fn ($task) => $task->statusHistories->map(fn ($history) => [
                    'type' => 'status',
                    'title' => $task->title . ': ' . ($history->old_status ?: 'New') . ' to ' . $history->new_status,
                    'date' => $history->created_at,
                    'status' => $history->new_status,
                ])))
                ->merge($project->documents->map(fn ($document) => [
                    'type' => 'document',
                    'title' => $document->title,
                    'date' => $document->created_at,
                    'status' => $document->document_category ?? 'document',
                ]))
                ->merge($project->approvals->map(fn ($approval) => [
                    'type' => 'approval',
                    'title' => $approval->title,
                    'date' => $approval->approved_at ?? $approval->created_at,
                    'status' => $approval->status,
                ]))
                ->sortBy('date')
                ->values(),
        ]);
    }

}
