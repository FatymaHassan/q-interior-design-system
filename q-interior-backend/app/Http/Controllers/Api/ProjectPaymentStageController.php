<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectPaymentStage;
use App\Services\ProjectFinanceService;
use Illuminate\Http\Request;

class ProjectPaymentStageController extends Controller
{
    public function index(Project $project)
    {
        return $project->paymentStages()->with('invoice')->orderBy('id')->get();
    }

    public function store(Request $request, Project $project, ProjectFinanceService $finance)
    {
        $data = $this->validated($request);
        $data['balance'] = $data['balance'] ?? $data['amount'];

        $stage = $project->paymentStages()->create($data);
        $finance->refreshProject($project);

        return $stage->fresh('invoice');
    }

    public function update(Request $request, ProjectPaymentStage $projectPaymentStage, ProjectFinanceService $finance)
    {
        $data = $this->validated($request, true);
        if (array_key_exists('amount', $data) && ! array_key_exists('balance', $data)) {
            $data['balance'] = max(0, (float) $data['amount'] - (float) $projectPaymentStage->paid_amount);
        }

        $projectPaymentStage->update($data);
        $finance->refreshProject($projectPaymentStage->project);

        return $projectPaymentStage->fresh('invoice');
    }

    public function destroy(ProjectPaymentStage $projectPaymentStage, ProjectFinanceService $finance)
    {
        $project = $projectPaymentStage->project;
        $projectPaymentStage->delete();
        $finance->refreshProject($project);

        return response()->json(['message' => 'Payment stage deleted successfully']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => 'nullable|string',
            'percentage' => 'nullable|numeric|min:0|max:100',
            'amount' => [$partial ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'due_condition' => 'nullable|string|max:255',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:Pending,Due,Partially Paid,Paid,Overdue,Cancelled',
            'invoice_id' => 'nullable|exists:invoices,id',
            'paid_amount' => 'nullable|numeric|min:0',
            'balance' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);
    }
}
