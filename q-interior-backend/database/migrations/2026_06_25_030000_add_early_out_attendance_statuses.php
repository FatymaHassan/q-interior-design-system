<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE attendances MODIFY status ENUM('Present','Late','Early Out','Late / Early Out','Absent','Half Day','On Leave') NOT NULL DEFAULT 'Present'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE attendances SET status = 'Late' WHERE status = 'Late / Early Out'");
            DB::statement("UPDATE attendances SET status = 'Present' WHERE status = 'Early Out'");
            DB::statement("ALTER TABLE attendances MODIFY status ENUM('Present','Late','Absent','Half Day','On Leave') NOT NULL DEFAULT 'Present'");
        }
    }
};
