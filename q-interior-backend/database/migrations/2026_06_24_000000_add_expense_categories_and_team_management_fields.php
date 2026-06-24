<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expense_categories', function (Blueprint $table) {
            if (! Schema::hasColumn('expense_categories', 'description')) {
                $table->text('description')->nullable()->after('type');
            }
            if (! Schema::hasColumn('expense_categories', 'status')) {
                $table->enum('status', ['Active', 'Inactive'])->default('Active')->after('description');
            }
            if (! Schema::hasColumn('expense_categories', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('expense_categories', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'specialty')) {
                $table->string('specialty')->nullable()->after('position');
            }
            if (! Schema::hasColumn('employees', 'daily_rate')) {
                $table->decimal('daily_rate', 12, 2)->nullable()->after('specialty');
            }
        });

        Schema::table('project_members', function (Blueprint $table) {
            if (! Schema::hasColumn('project_members', 'employee_id')) {
                $table->foreignId('employee_id')->nullable()->after('project_id')->constrained('employees')->nullOnDelete();
            }
            if (! Schema::hasColumn('project_members', 'role_on_project')) {
                $table->string('role_on_project')->nullable()->after('role');
            }
            if (! Schema::hasColumn('project_members', 'assigned_date')) {
                $table->date('assigned_date')->nullable()->after('assigned_at');
            }
            if (! Schema::hasColumn('project_members', 'notes')) {
                $table->text('notes')->nullable()->after('assigned_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('project_members', function (Blueprint $table) {
            foreach (['notes', 'assigned_date', 'role_on_project', 'employee_id'] as $column) {
                if (Schema::hasColumn('project_members', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            foreach (['daily_rate', 'specialty'] as $column) {
                if (Schema::hasColumn('employees', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            foreach (['updated_by', 'created_by', 'status', 'description'] as $column) {
                if (Schema::hasColumn('expense_categories', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
