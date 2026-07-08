<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_contract_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('client_name')->nullable();
            $table->string('project_name')->nullable();
            $table->decimal('contract_amount', 12, 2)->default(0);
            $table->decimal('total_quotation', 12, 2)->default(0);
            $table->decimal('budget', 12, 2)->default(0);
            $table->decimal('profit_percentage', 6, 2)->default(0);
            $table->decimal('deposit_percentage', 6, 2)->default(0);
            $table->decimal('deposit_amount', 12, 2)->default(0);
            $table->text('payment_terms')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique('project_id');
        });

        DB::table('projects')
            ->leftJoin('clients', 'projects.client_id', '=', 'clients.id')
            ->select([
                'projects.id',
                'projects.client_id',
                'clients.name as client_name',
                'projects.name',
                'projects.project_name',
                'projects.contract_amount',
                'projects.total_quotation',
                'projects.budget',
                'projects.profit_percentage',
                'projects.deposit_percentage',
                'projects.deposit_amount',
                'projects.payment_terms',
                'projects.created_by',
                'projects.created_at',
                'projects.updated_at',
            ])
            ->orderBy('projects.id')
            ->chunkById(200, function ($projects) {
                foreach ($projects as $project) {
                    DB::table('project_contract_snapshots')->insert([
                        'project_id' => $project->id,
                        'client_id' => $project->client_id,
                        'client_name' => $project->client_name,
                        'project_name' => $project->project_name ?: $project->name,
                        'contract_amount' => $project->contract_amount ?: 0,
                        'total_quotation' => $project->total_quotation ?: 0,
                        'budget' => $project->budget ?: 0,
                        'profit_percentage' => $project->profit_percentage ?: 0,
                        'deposit_percentage' => $project->deposit_percentage ?: 0,
                        'deposit_amount' => $project->deposit_amount ?: 0,
                        'payment_terms' => $project->payment_terms,
                        'created_by' => $project->created_by,
                        'created_at' => $project->created_at ?: now(),
                        'updated_at' => $project->updated_at ?: now(),
                    ]);
                }
            }, 'projects.id', 'id');
    }

    public function down(): void
    {
        Schema::dropIfExists('project_contract_snapshots');
    }
};
