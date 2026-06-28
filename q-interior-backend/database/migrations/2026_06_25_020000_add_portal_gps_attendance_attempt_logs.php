<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_attempt_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('office_location_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('attempt_type', ['check_in', 'check_out'])->default('check_in');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('distance_meters', 10, 2)->nullable();
            $table->boolean('is_location_valid')->default(false);
            $table->boolean('success')->default(false);
            $table->string('failure_reason')->nullable();
            $table->text('device_info')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE attendances MODIFY method ENUM('Manual','QR','System','Portal GPS') NOT NULL DEFAULT 'Manual'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_attempt_logs');

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE attendances MODIFY method ENUM('Manual','QR','System') NOT NULL DEFAULT 'Manual'");
        }
    }
};
