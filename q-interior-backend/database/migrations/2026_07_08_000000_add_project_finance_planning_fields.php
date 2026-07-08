<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'total_quotation')) {
                $table->decimal('total_quotation', 12, 2)->default(0)->after('budget');
            }
            if (! Schema::hasColumn('projects', 'profit_percentage')) {
                $table->decimal('profit_percentage', 6, 2)->default(0)->after('total_quotation');
            }
            if (! Schema::hasColumn('projects', 'expected_profit')) {
                $table->decimal('expected_profit', 12, 2)->default(0)->after('remaining_balance');
            }
            if (! Schema::hasColumn('projects', 'actual_profit')) {
                $table->decimal('actual_profit', 12, 2)->default(0)->after('expected_profit');
            }
            if (! Schema::hasColumn('projects', 'profit_margin')) {
                $table->decimal('profit_margin', 6, 2)->default(0)->after('actual_profit');
            }
        });

        DB::table('projects')->orderBy('id')->chunkById(100, function ($projects) {
            foreach ($projects as $project) {
                $quotation = (float) ($project->total_quotation ?? 0);
                $contract = (float) ($project->contract_amount ?: $project->revenue ?: $project->budget ?: 0);
                $cost = (float) ($project->actual_cost ?? 0);
                $paid = (float) ($project->paid_amount ?? 0);

                DB::table('projects')->where('id', $project->id)->update([
                    'total_quotation' => $quotation > 0 ? $quotation : $contract,
                    'expected_profit' => round($contract - $cost, 2),
                    'actual_profit' => round($paid - $cost, 2),
                    'profit_margin' => $contract > 0 ? round((($contract - $cost) / $contract) * 100, 2) : 0,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            foreach (['profit_margin', 'actual_profit', 'expected_profit', 'profit_percentage', 'total_quotation'] as $column) {
                if (Schema::hasColumn('projects', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
