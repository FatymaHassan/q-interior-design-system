<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expense_categories', function (Blueprint $table) {
            if (! Schema::hasColumn('expense_categories', 'expense_type')) {
                $table->string('expense_type')->default('project')->after('type');
            }
            if (! Schema::hasColumn('expense_categories', 'group_name')) {
                $table->string('group_name')->nullable()->after('expense_type');
            }
        });

        Schema::table('expenses', function (Blueprint $table) {
            if (! Schema::hasColumn('expenses', 'expense_type')) {
                $table->string('expense_type')->default('project')->after('category_id');
            }
            if (! Schema::hasColumn('expenses', 'employee_id') && Schema::hasTable('employees')) {
                $table->foreignId('employee_id')->nullable()->after('supplier_id')->constrained('employees')->nullOnDelete();
            }
            if (! Schema::hasColumn('expenses', 'is_manual_total')) {
                $table->boolean('is_manual_total')->default(false)->after('total_cost');
            }
            if (! Schema::hasColumn('expenses', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        $hasCategoryType = DB::getDriverName() !== 'sqlite' && Schema::hasColumn('expense_categories', 'type');

        DB::table('expense_categories')->update([
            'expense_type' => $hasCategoryType
                ? DB::raw("CASE WHEN type = 'payroll' THEN 'payroll' WHEN type = 'overhead' THEN 'overhead' ELSE 'project' END")
                : 'project',
        ]);

        if ($hasCategoryType) {
            DB::table('expenses')
                ->leftJoin('expense_categories', 'expenses.category_id', '=', 'expense_categories.id')
                ->update([
                    'expenses.expense_type' => DB::raw("CASE WHEN expenses.project_id IS NOT NULL THEN 'project' WHEN expense_categories.type = 'payroll' THEN 'payroll' WHEN expense_categories.type = 'overhead' THEN 'overhead' ELSE 'project' END"),
                ]);
        } else {
            DB::table('expenses')->update([
                'expense_type' => DB::raw("CASE WHEN project_id IS NOT NULL THEN 'project' ELSE 'project' END"),
            ]);
        }

        foreach ($this->defaultCategories() as $category) {
            $values = [
                'expense_type' => $category['expense_type'],
                'group_name' => $category['group_name'],
                'description' => $category['description'],
                'status' => 'Active',
                'updated_at' => now(),
                'created_at' => now(),
            ];
            if ($hasCategoryType) {
                $values['type'] = $category['type'];
            }
            DB::table('expense_categories')->updateOrInsert(
                ['name' => $category['name'], 'expense_type' => $category['expense_type']],
                $values
            );
        }
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            foreach (['updated_by', 'employee_id'] as $column) {
                if (Schema::hasColumn('expenses', $column)) {
                    $table->dropConstrainedForeignId($column);
                }
            }
            foreach (['is_manual_total', 'expense_type'] as $column) {
                if (Schema::hasColumn('expenses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            foreach (['group_name', 'expense_type'] as $column) {
                if (Schema::hasColumn('expense_categories', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    private function defaultCategories(): array
    {
        return [
            ['name' => 'Design Consultation', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Design Costs', 'description' => 'Design fees, drawings, renders, and consultation costs.'],
            ['name' => 'Materials', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Materials', 'description' => 'Project material purchases and material usage.'],
            ['name' => 'Labour', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Labour Costs', 'description' => 'Project labour and contractor work.'],
            ['name' => 'Site Expenses', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Site Expenses', 'description' => 'Transport, site petty cash, fuel, and site operations.'],
            ['name' => 'Other Project Costs', 'type' => 'project_expense', 'expense_type' => 'project', 'group_name' => 'Other Project Costs', 'description' => 'Other project-specific costs.'],
            ['name' => 'Office Rent', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Office rent and recurring company operating cost.'],
            ['name' => 'Utilities', 'type' => 'overhead', 'expense_type' => 'overhead', 'group_name' => 'Company Overhead', 'description' => 'Electricity, internet, water, and utilities.'],
            ['name' => 'Employee Payroll', 'type' => 'payroll', 'expense_type' => 'payroll', 'group_name' => 'Payroll', 'description' => 'Salary and payroll expenses.'],
        ];
    }
};
