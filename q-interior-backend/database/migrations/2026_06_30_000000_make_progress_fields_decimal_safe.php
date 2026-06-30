<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if (Schema::hasTable('projects') && Schema::hasColumn('projects', 'progress')) {
            $this->decimalColumn($driver, 'projects', 'progress');
        }

        if (Schema::hasTable('employee_goals') && Schema::hasColumn('employee_goals', 'progress')) {
            $this->decimalColumn($driver, 'employee_goals', 'progress');
        }
    }

    public function down(): void
    {
        // Keep decimal-safe progress values. Reverting to tiny integers could truncate existing data.
    }

    private function decimalColumn(string $driver, string $table, string $column): void
    {
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE `{$table}` MODIFY `{$column}` DECIMAL(8,2) NOT NULL DEFAULT 0");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} TYPE NUMERIC(8,2) USING {$column}::numeric");
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} SET DEFAULT 0");
        }
    }
};
