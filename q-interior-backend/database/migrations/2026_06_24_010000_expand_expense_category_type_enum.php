<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql' && Schema::hasTable('expense_categories')) {
            DB::statement("ALTER TABLE expense_categories MODIFY type ENUM('project_expense','overhead','inventory','payroll','other') NOT NULL DEFAULT 'project_expense'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql' && Schema::hasTable('expense_categories')) {
            DB::statement("ALTER TABLE expense_categories MODIFY type ENUM('project_expense','overhead','payroll','other') NOT NULL DEFAULT 'project_expense'");
        }
    }
};
