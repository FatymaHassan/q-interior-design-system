<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $projects = DB::table('projects')
            ->leftJoin('project_payment_stages', 'projects.id', '=', 'project_payment_stages.project_id')
            ->whereNull('project_payment_stages.id')
            ->select('projects.id', 'projects.contract_amount', 'projects.budget', 'projects.revenue')
            ->get();

        foreach ($projects as $project) {
            $contract = (float) ($project->contract_amount ?: $project->revenue ?: $project->budget ?: 0);
            foreach ([['Advance Payment', 50, 'Before project starts', 'Due'], ['Progress Payment', 30, 'When project reaches 30% progress', 'Pending'], ['Final Payment', 20, 'On project completion', 'Pending']] as [$name, $percentage, $condition, $status]) {
                $amount = round($contract * $percentage / 100, 2);
                DB::table('project_payment_stages')->insert([
                    'project_id' => $project->id,
                    'name' => $name,
                    'percentage' => $percentage,
                    'amount' => $amount,
                    'due_condition' => $condition,
                    'status' => $status,
                    'paid_amount' => 0,
                    'balance' => $amount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
    }
};
