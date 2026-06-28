<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('office_locations', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('SOMOIL CAR WASH');
            $table->decimal('latitude', 10, 7)->default(2.0314625);
            $table->decimal('longitude', 10, 7)->default(45.3122031);
            $table->unsignedInteger('allowed_radius_meters')->default(100);
            $table->time('work_start_time')->default('08:00:00');
            $table->time('work_end_time')->default('17:00:00');
            $table->time('late_threshold_time')->default('08:15:00');
            $table->enum('status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();
        });

        Schema::create('attendance_qr_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('office_location_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 128);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->enum('status', ['Active', 'Expired', 'Revoked'])->default('Active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('attendance_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('office_location_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('attendance_qr_code_id')->nullable()->constrained('attendance_qr_codes')->nullOnDelete();
            $table->enum('scan_type', ['check_in', 'check_out'])->default('check_in');
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

        Schema::table('attendances', function (Blueprint $table) {
            if (! Schema::hasColumn('attendances', 'office_location_id')) {
                $table->foreignId('office_location_id')->nullable()->after('employee_id')->constrained('office_locations')->nullOnDelete();
            }
            foreach ([
                'check_in_latitude' => 'check_in',
                'check_in_longitude' => 'check_in_latitude',
                'check_out_latitude' => 'check_out',
                'check_out_longitude' => 'check_out_latitude',
            ] as $column => $after) {
                if (! Schema::hasColumn('attendances', $column)) {
                    $table->decimal($column, 10, 7)->nullable()->after($after);
                }
            }
            foreach ([
                'check_in_distance_meters' => 'check_in_longitude',
                'check_out_distance_meters' => 'check_out_longitude',
            ] as $column => $after) {
                if (! Schema::hasColumn('attendances', $column)) {
                    $table->decimal($column, 10, 2)->nullable()->after($after);
                }
            }
            if (! Schema::hasColumn('attendances', 'late_minutes')) {
                $table->unsignedInteger('late_minutes')->default(0)->after('status');
            }
            if (! Schema::hasColumn('attendances', 'device_info')) {
                $table->text('device_info')->nullable()->after('notes');
            }
        });

        DB::table('office_locations')->updateOrInsert(
            ['name' => 'SOMOIL CAR WASH'],
            [
                'latitude' => 2.0314625,
                'longitude' => 45.3122031,
                'allowed_radius_meters' => 100,
                'work_start_time' => '08:00:00',
                'work_end_time' => '17:00:00',
                'late_threshold_time' => '08:15:00',
                'status' => 'Active',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            foreach (['office_location_id', 'check_in_latitude', 'check_in_longitude', 'check_out_latitude', 'check_out_longitude', 'check_in_distance_meters', 'check_out_distance_meters', 'late_minutes', 'device_info'] as $column) {
                if (Schema::hasColumn('attendances', $column)) {
                    $column === 'office_location_id' ? $table->dropConstrainedForeignId($column) : $table->dropColumn($column);
                }
            }
        });
        Schema::dropIfExists('attendance_scan_logs');
        Schema::dropIfExists('attendance_qr_codes');
        Schema::dropIfExists('office_locations');
    }
};
