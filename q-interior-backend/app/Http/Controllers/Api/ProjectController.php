<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Project;
use App\Services\ProjectFinanceService;
use App\Services\ProjectPaymentPlanService;
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

    public function store(Request $request, ProjectPaymentPlanService $paymentPlanService, ProjectFinanceService $finance)
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
            'contract_amount' => 'nullable|numeric|min:0',
            'payment_plan_type' => 'nullable|string|max:255',
            'deposit_percentage' => 'nullable|numeric|min:0|max:100',
            'deposit_amount' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string',
            'payment_stages' => 'nullable|array',
            'payment_stages.*.name' => 'required_with:payment_stages|string|max:255',
            'payment_stages.*.percentage' => 'nullable|numeric|min:0|max:100',
            'payment_stages.*.amount' => 'nullable|numeric|min:0',
            'payment_stages.*.due_condition' => 'nullable|string|max:255',
            'payment_stages.*.due_date' => 'nullable|date',
            'payment_stages.*.status' => 'nullable|string|max:255',
            'payment_stages.*.notes' => 'nullable|string',
            'revenue' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
            'progress' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|in:Pending,Active,Completed,Cancelled,pending,active,completed,cancelled,In Progress,Delayed',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $stages = $data['payment_stages'] ?? [];
        unset($data['payment_stages']);
        $data['project_name'] = $data['name'];
        $data['contract_amount'] = $data['contract_amount'] ?? $data['revenue'] ?? $data['budget'] ?? 0;
        $data['budget'] = $data['budget'] ?? $data['contract_amount'];
        $data['revenue'] = $data['revenue'] ?? $data['contract_amount'];
        $data['deposit_amount'] = $data['deposit_amount'] ?? round(((float) $data['contract_amount'] * (float) ($data['deposit_percentage'] ?? 0)) / 100, 2);

        $project = Project::create($data);
        $paymentPlanService->syncDefaultStages($project, $stages);
        $finance->refreshProject($project);

        return $project->load(['client', 'stage', 'paymentStages']);
    }

    public function show(Project $project)
    {
        $project->load(['client', 'stage', 'paymentStages.invoice', 'invoices.client', 'invoices.supplier', 'payments.client', 'payments.supplier', 'members.user.roles', 'members.employee.department', 'documents.uploader', 'tasks.assignee', 'tasks.assigneeEmployee.department', 'tasks.assigner', 'tasks.statusHistories.changer', 'tasks.attachments.uploader', 'clientMessages.client', 'clientMessages.user', 'approvals.signature']);

        return $project;
    }

    public function update(Request $request, Project $project, ProjectPaymentPlanService $paymentPlanService, ProjectFinanceService $finance)
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
            'contract_amount' => 'nullable|numeric|min:0',
            'payment_plan_type' => 'nullable|string|max:255',
            'deposit_percentage' => 'nullable|numeric|min:0|max:100',
            'deposit_amount' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string',
            'payment_stages' => 'nullable|array',
            'payment_stages.*.name' => 'required_with:payment_stages|string|max:255',
            'payment_stages.*.percentage' => 'nullable|numeric|min:0|max:100',
            'payment_stages.*.amount' => 'nullable|numeric|min:0',
            'payment_stages.*.due_condition' => 'nullable|string|max:255',
            'payment_stages.*.due_date' => 'nullable|date',
            'payment_stages.*.status' => 'nullable|string|max:255',
            'payment_stages.*.notes' => 'nullable|string',
            'revenue' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
            'progress' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|in:Pending,Active,Completed,Cancelled,pending,active,completed,cancelled,In Progress,Delayed',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|exists:users,id',
        ]);
        $stages = $data['payment_stages'] ?? null;
        unset($data['payment_stages']);
        if (isset($data['name'])) {
            $data['project_name'] = $data['name'];
        }
        if (isset($data['contract_amount']) && ! isset($data['deposit_amount'])) {
            $data['deposit_amount'] = round(((float) $data['contract_amount'] * (float) ($data['deposit_percentage'] ?? $project->deposit_percentage ?? 0)) / 100, 2);
        }

        $project->update($data);
        if (is_array($stages)) {
            $paymentPlanService->syncDefaultStages($project, $stages);
        }
        $finance->refreshProject($project);

        return $project->load(['client', 'stage', 'paymentStages']);
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
        $project->load(['stage', 'tasks.assignee', 'tasks.assigneeEmployee.department', 'tasks.statusHistories.changer', 'documents.uploader', 'clientMessages.client', 'approvals.signature']);

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

    public function financeSummary(Project $project, ProjectFinanceService $finance)
    {
        return response()->json($finance->summary($project));
    }

    public function expenses(Project $project)
    {
        return $project->expenses()
            ->where(fn ($query) => $query->where('expense_type', 'project')->orWhereNull('expense_type'))
            ->with(['supplier', 'employee', 'categoryModel', 'approver'])
            ->latest()
            ->get();
    }

    public function payments(Project $project)
    {
        return $project->payments()
            ->clientRevenue()
            ->with(['client', 'invoice', 'paymentStage'])
            ->latest()
            ->get();
    }

    public function storePayment(Request $request, Project $project, ProjectFinanceService $finance)
    {
        $data = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'payment_stage_id' => 'nullable|exists:project_payment_stages,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $payment = Payment::create(array_merge($data, [
            'project_id' => $project->id,
            'client_id' => $data['client_id'] ?? $project->client_id,
            'type' => 'client',
            'payment_date' => $data['payment_date'] ?? now()->toDateString(),
            'status' => $data['status'] ?? 'completed',
            'created_by' => $request->user()?->id,
        ]));

        $finance->refreshProject($project);

        return $payment->load(['project', 'client', 'invoice', 'paymentStage']);
    }

}
