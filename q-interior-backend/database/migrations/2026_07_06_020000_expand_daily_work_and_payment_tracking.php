<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            if (! Schema::hasColumn('tasks', 'work_date')) {
                $table->date('work_date')->nullable()->after('description');
            }
            if (! Schema::hasColumn('tasks', 'related_stage')) {
                $table->string('related_stage')->nullable()->after('work_date');
            }
            if (! Schema::hasColumn('tasks', 'progress_added')) {
                $table->decimal('progress_added', 8, 2)->default(0)->after('related_stage');
            }
            if (! Schema::hasColumn('tasks', 'admin_note')) {
                $table->text('admin_note')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('tasks', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('admin_note')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('tasks', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }
            if (! Schema::hasColumn('tasks', 'rejected_at')) {
                $table->timestamp('rejected_at')->nullable()->after('approved_at');
            }
        });

        if (Schema::hasColumn('tasks', 'status') && DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE tasks MODIFY status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        }

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'payment_type')) {
                $table->string('payment_type')->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('payments', 'related_stage')) {
                $table->string('related_stage')->nullable()->after('payment_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            foreach (['related_stage', 'payment_type'] as $column) {
                if (Schema::hasColumn('payments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('tasks', function (Blueprint $table) {
            foreach (['rejected_at', 'approved_at'] as $column) {
                if (Schema::hasColumn('tasks', $column)) {
                    $table->dropColumn($column);
                }
            }
            if (Schema::hasColumn('tasks', 'approved_by')) {
                $table->dropConstrainedForeignId('approved_by');
            }
            foreach (['admin_note', 'progress_added', 'related_stage', 'work_date'] as $column) {
                if (Schema::hasColumn('tasks', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
