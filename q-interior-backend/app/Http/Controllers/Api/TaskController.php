<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Task;
use App\Models\TaskStatusHistory;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $this->markOverdueTasks();

        return Task::with(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'comments.user', 'attachments'])
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
            'priority' => 'nullable|in:Low,Medium,High',
            'status' => 'nullable|in:Pending,In Progress,Done,Overdue',
            'deadline' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);
        $data['assigned_by'] = $data['assigned_by'] ?? $request->user()?->id;

        $task = Task::create($data);

        if ($task->assigned_to) {
            Notification::create([
                'title' => 'New task assigned',
                'message' => $task->title,
                'type' => 'task',
                'is_read' => false,
            ]);
        }

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'comments.user', 'attachments']);
    }

    public function show(Task $task)
    {
        $this->authorizeTaskAccess(request(), $task);

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'comments.user', 'attachments.uploader', 'statusHistories.changer']);
    }

    public function update(Request $request, Task $task)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'assigned_to' => 'nullable|exists:users,id',
            'employee_id' => 'nullable|exists:employees,id',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:Low,Medium,High',
            'status' => 'nullable|in:Pending,In Progress,Done,Overdue',
            'deadline' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $oldStatus = $task->status;
        if (($data['status'] ?? null) === 'Done' && ! $task->completed_at) {
            $data['completed_at'] = now();
        }

        $task->update($data);
        $this->recordStatusChange($task, $oldStatus, $data['status'] ?? null, $request);

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'assigner', 'comments.user', 'attachments.uploader', 'statusHistories.changer']);
    }

    public function destroy(Task $task)
    {
        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }

    public function status(Request $request, Task $task)
    {
        $this->authorizeTaskAccess($request, $task);
        $data = $request->validate(['status' => 'required|in:Pending,In Progress,Done,Overdue']);
        $oldStatus = $task->status;
        if ($data['status'] === 'Done') {
            $data['completed_at'] = now();
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

        return $task->load(['project.client', 'assignee', 'assigneeEmployee.department', 'statusHistories.changer']);
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
        $tasks = Task::where('status', '!=', 'Done')->whereDate('deadline', '<', today())->where('status', '!=', 'Overdue')->get();

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
}
