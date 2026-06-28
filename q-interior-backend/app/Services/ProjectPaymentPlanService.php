<?php

namespace App\Services;

use App\Models\Project;

class ProjectPaymentPlanService
{
    public function syncDefaultStages(Project $project, array $customStages = []): void
    {
        if ($project->paymentStages()->exists() && empty($customStages)) {
            return;
        }

        $stages = $customStages ?: $this->defaultStages($project);
        if (empty($stages)) {
            return;
        }

        $project->paymentStages()->delete();
        foreach ($stages as $stage) {
            $amount = isset($stage['amount'])
                ? (float) $stage['amount']
                : round(((float) $project->contract_amount * (float) ($stage['percentage'] ?? 0)) / 100, 2);

            $project->paymentStages()->create([
                'name' => $stage['name'] ?? 'Payment Stage',
                'description' => $stage['description'] ?? null,
                'percentage' => (float) ($stage['percentage'] ?? 0),
                'amount' => $amount,
                'due_condition' => $stage['due_condition'] ?? null,
                'due_date' => $stage['due_date'] ?? null,
                'status' => $stage['status'] ?? 'Pending',
                'paid_amount' => 0,
                'balance' => $amount,
                'notes' => $stage['notes'] ?? null,
            ]);
        }
    }

    private function defaultStages(Project $project): array
    {
        $type = $project->payment_plan_type ?: 'Deposit + Final Payment';
        $deposit = (float) ($project->deposit_percentage ?: 50);

        return match ($type) {
            'Full Payment' => [
                ['name' => 'Full Payment', 'percentage' => 100, 'due_condition' => 'Before project starts', 'status' => 'Due'],
            ],
            'Progress Payments' => [
                ['name' => 'Advance Payment', 'percentage' => 50, 'due_condition' => 'Before project starts', 'status' => 'Due'],
                ['name' => 'Progress Payment', 'percentage' => 30, 'due_condition' => 'When project reaches 30% progress', 'status' => 'Pending'],
                ['name' => 'Final Payment', 'percentage' => 20, 'due_condition' => 'On project completion', 'status' => 'Pending'],
            ],
            'Milestone Payments' => [
                ['name' => 'Advance Payment', 'percentage' => 40, 'due_condition' => 'Before project starts', 'status' => 'Due'],
                ['name' => 'Mid Project Payment', 'percentage' => 30, 'due_condition' => 'Mid-project milestone approval', 'status' => 'Pending'],
                ['name' => 'Final Payment', 'percentage' => 30, 'due_condition' => 'On project completion', 'status' => 'Pending'],
            ],
            'Custom Payment Plan' => [],
            default => [
                ['name' => 'Advance Payment', 'percentage' => $deposit, 'due_condition' => 'Before project starts', 'status' => 'Due'],
                ['name' => 'Final Payment', 'percentage' => max(0, 100 - $deposit), 'due_condition' => 'On project completion', 'status' => 'Pending'],
            ],
        };
    }
}
