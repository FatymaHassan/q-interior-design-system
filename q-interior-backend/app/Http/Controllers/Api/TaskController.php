<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\ProjectStage;
use App\Models\Task;
use App\Models\TaskStatusHistory;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $this->markOverdueTasks();

        return Task::with(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'approver', 'comments.user', 'attachments'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('assigned_to'), fn ($query, $value) => $query->where('assigned_to', $value))
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value))
            ->when($request->query('status'), fn ($query, $value) => $query->where('status', $value))
            ->when($request->query('priority'), fn ($query, $value) => $query->where('priority', $value))
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'assigned_to' => 'nullable|exists:users,id',
            'employee_id' => 'nullable|exists:employees,id',
            'assigned_by' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'work_date' => 'nullable|date',
            'related_stage' => 'nullable|string|max:255',
            'progress_added' => 'nullable|numeric|min:0|max:100',
            'priority' => 'nullable|in:Low,Medium,High',
            'status' => 'nullable|in:Pending,In Progress,Done,Overdue,Approved,Rejected',
            'deadline' => 'nullable|date',
            'notes' => 'nullable|string',
            'admin_note' => 'nullable|string',
        ]);
        $data['assigned_by'] = $data['assigned_by'] ?? $request->user()?->id;
        $data['work_date'] = $data['work_date'] ?? now()->toDateString();

        $task = Task::create($data);

        if ($task->assigned_to) {
            Notification::create([
                'title' => 'New task assigned',
                'message' => $task->title,
                'type' => 'task',
                'is_read' => false,
            ]);
        }

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'approver', 'comments.user', 'attachments']);
    }

    public function show(Task $task)
    {
        $this->authorizeTaskAccess(request(), $task);

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'approver', 'comments.user', 'attachments.uploader', 'statusHistories.changer']);
    }

    public function update(Request $request, Task $task)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'assigned_to' => 'nullable|exists:users,id',
            'employee_id' => 'nullable|exists:employees,id',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'work_date' => 'nullable|date',
            'related_stage' => 'nullable|string|max:255',
            'progress_added' => 'nullable|numeric|min:0|max:100',
            'priority' => 'nullable|in:Low,Medium,High',
            'status' => 'nullable|in:Pending,In Progress,Done,Overdue,Approved,Rejected',
            'deadline' => 'nullable|date',
            'notes' => 'nullable|string',
            'admin_note' => 'nullable|string',
        ]);

        $oldStatus = $task->status;
        if (($data['status'] ?? null) === 'Done' && ! $task->completed_at) {
            $data['completed_at'] = now();
        }

        $task->update($data);
        $this->recordStatusChange($task, $oldStatus, $data['status'] ?? null, $request);

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'approver', 'comments.user', 'attachments.uploader', 'statusHistories.changer']);
    }

    public function destroy(Task $task)
    {
        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }

    public function status(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($request, $task);
        $data = $request->validate(['status' => 'required|in:Pending,In Progress,Done,Overdue,Approved,Rejected']);
        $oldStatus = $task->status;
        if ($data['status'] === 'Done') {
            $data['completed_at'] = now();
        }
        if ($data['status'] === 'Approved') {
            $data['approved_by'] = $request->user()?->id;
            $data['approved_at'] = now();
            $data['completed_at'] = now();
        }
        if ($data['status'] === 'Rejected') {
            $data['rejected_at'] = now();
        }
        $task->update($data);
        $this->recordStatusChange($task, $oldStatus, $data['status'], $request);

        Notification::create([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'title' => $data['status'] === 'Done' ? 'Task completed' : 'Task status changed',
            'message' => $task->title . ' is now ' . $data['status'],
            'type' => $data['status'] === 'Done' ? 'task_completed' : 'task_status_changed',
            'link' => '/tasks/' . $task->id,
            'is_read' => false,
        ]);

        if ($data['status'] === 'Approved' && $oldStatus !== 'Approved') {
            $this->applyApprovedProgress($task);
        }

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'approver', 'statusHistories.changer']);
    }

    public function approve(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($request, $task);

        $data = $request->validate([
            'admin_note' => 'nullable|string',
            'progress_added' => 'nullable|numeric|min:0|max:100',
            'related_stage' => 'nullable|string|max:255',
        ]);

        $oldStatus = $task->status;
        $task->update([
            'status' => 'Approved',
            'admin_note' => $data['admin_note'] ?? $task->admin_note,
            'progress_added' => $data['progress_added'] ?? $task->progress_added ?? 0,
            'related_stage' => $data['related_stage'] ?? $task->related_stage,
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
            'rejected_at' => null,
            'completed_at' => now(),
        ]);
        $this->recordStatusChange($task, $oldStatus, 'Approved', $request);
        if ($oldStatus !== 'Approved') {
            $this->applyApprovedProgress($task);
        }

        Notification::create([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'title' => 'Daily work approved',
            'message' => $task->title,
            'type' => 'daily_work_approved',
            'link' => '/tasks/' . $task->id,
            'is_read' => false,
        ]);

        return $task->fresh(['project.client', 'assignee', 'assigneeEmployee.department', 'approver', 'statusHistories.changer']);
    }

    public function reject(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($request, $task);

        $data = $request->validate([
            'admin_note' => 'nullable|string',
        ]);

        $oldStatus = $task->status;
        $task->update([
            'status' => 'Rejected',
            'admin_note' => $data['admin_note'] ?? $task->admin_note,
            'rejected_at' => now(),
        ]);
        $this->recordStatusChange($task, $oldStatus, 'Rejected', $request);

        Notification::create([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'title' => 'Daily work rejected',
            'message' => $task->title,
            'type' => 'daily_work_rejected',
            'link' => '/tasks/' . $task->id,
            'is_read' => false,
        ]);

        return $task->fresh(['project.client', 'assignee', 'assigneeEmployee.department', 'approver', 'statusHistories.changer']);
    }

    public function dailySummary(Request $request)
    {
        $this->markOverdueTasks();
        $date = $request->query('date', today()->toDateString());
        $base = Task::with(['project', 'assignee', 'assigneeEmployee.department'])
            ->when($request->query('project_id'), fn ($query, $value) => $query->where('project_id', $value))
            ->when($request->query('staff_id'), fn ($query, $value) => $query->where(function ($staffQuery) use ($value) {
                $staffQuery->where('assigned_to', $value)->orWhere('employee_id', $value);
            }))
            ->when($request->query('employee_id'), fn ($query, $value) => $query->where('employee_id', $value));

        return response()->json([
            'date' => $date,
            'completed_today' => (clone $base)->whereDate('completed_at', $date)->get(),
            'pending' => (clone $base)->where('status', 'Pending')->get(),
            'in_progress' => (clone $base)->where('status', 'In Progress')->get(),
            'overdue' => (clone $base)->where('status', 'Overdue')->get(),
            'approved' => (clone $base)->where('status', 'Approved')->get(),
            'rejected' => (clone $base)->where('status', 'Rejected')->get(),
        ]);
    }

    public function checkOverdue()
    {
        $count = $this->markOverdueTasks();

        return response()->json(['updated' => $count]);
    }

    private function recordStatusChange(Task $task, ?string $oldStatus, ?string $newStatus, Request $request): void
    {
        if (! $newStatus || $oldStatus === $newStatus) {
            return;
        }

        TaskStatusHistory::create([
            'task_id' => $task->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'changed_by' => $request->user()?->id,
            'note' => $request->input('note'),
        ]);
    }

    private function authorizeTaskAccess(Request $request, Task $task): void
    {
        $user = $request->user();
        if (! $user || $user->hasAnyRole(['admin', 'manager'])) {
            return;
        }

        abort_unless((int) $task->assigned_to === (int) $user->id, 403);
    }

    private function markOverdueTasks(): int
    {
        $tasks = Task::whereNotIn('status', ['Done', 'Approved', 'Rejected', 'Overdue'])->whereDate('deadline', '<', today())->get();

        foreach ($tasks as $task) {
            $oldStatus = $task->status;
            $task->update(['status' => 'Overdue']);
            TaskStatusHistory::create([
                'task_id' => $task->id,
                'old_status' => $oldStatus,
                'new_status' => 'Overdue',
                'note' => 'Automatically marked overdue.',
            ]);
            Notification::create([
                'project_id' => $task->project_id,
                'task_id' => $task->id,
                'title' => 'Task overdue',
                'message' => $task->title,
                'type' => 'task_overdue',
                'link' => '/tasks/' . $task->id,
                'is_read' => false,
            ]);
        }

        return $tasks->count();
    }

    private function applyApprovedProgress(Task $task): void
    {
        $task->loadMissing('project');
        $project = $task->project;
        if (! $project) {
            return;
        }

        $progressAdded = (float) ($task->progress_added ?? 0);
        if ($progressAdded <= 0) {
            return;
        }

        $progress = min(100, max(0, (float) $project->progress + $progressAdded));
        $updates = ['progress' => round($progress, 2)];
        $stage = $this->stageForProgress($progress, $task->related_stage);
        if ($stage) {
            $updates['project_stage_id'] = $stage->id;
        }
        if ($progress >= 100) {
            $updates['status'] = 'Completed';
        }

        $project->update($updates);
    }

    private function stageForProgress(float $progress, ?string $requestedStage = null): ?ProjectStage
    {
        if ($requestedStage) {
            $stage = ProjectStage::where('name', $requestedStage)->first();
            if ($stage) {
                return $stage;
            }
        }

        $stageName = match (true) {
            $progress >= 100 => 'Completed',
            $progress >= 61 => 'Installation',
            $progress >= 41 => 'Materials Order',
            $progress >= 21 => 'Design',
            default => 'Inquiry',
        };

        return ProjectStage::where('name', $stageName)->first();
    }
}
