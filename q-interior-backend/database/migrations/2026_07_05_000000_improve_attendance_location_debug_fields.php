<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            foreach ([
                'check_in_office_latitude' => ['type' => 'coordinate', 'after' => 'check_in_longitude'],
                'check_in_office_longitude' => ['type' => 'coordinate', 'after' => 'check_in_longitude'],
                'check_in_allowed_radius_meters' => ['type' => 'integer', 'after' => 'check_in_distance_meters'],
                'check_in_gps_accuracy_meters' => ['type' => 'decimal', 'after' => 'check_in_distance_meters'],
                'check_out_office_latitude' => ['type' => 'coordinate', 'after' => 'check_out_longitude'],
                'check_out_office_longitude' => ['type' => 'coordinate', 'after' => 'check_out_longitude'],
                'check_out_allowed_radius_meters' => ['type' => 'integer', 'after' => 'check_out_distance_meters'],
                'check_out_gps_accuracy_meters' => ['type' => 'decimal', 'after' => 'check_out_distance_meters'],
            ] as $column => $definition) {
                if (! Schema::hasColumn('attendances', $column)) {
                    if ($definition['type'] === 'integer') {
                        $table->unsignedInteger($column)->nullable()->after($definition['after']);
                    } elseif ($definition['type'] === 'coordinate') {
                        $table->decimal($column, 10, 7)->nullable()->after($definition['after']);
                    } else {
                        $table->decimal($column, 10, 2)->nullable()->after($definition['after']);
                    }
                }
            }
        });

        Schema::table('attendance_attempt_logs', function (Blueprint $table) {
            foreach ([
                'gps_accuracy_meters' => ['type' => 'decimal', 'after' => 'distance_meters'],
                'office_latitude' => ['type' => 'coordinate', 'after' => 'distance_meters'],
                'office_longitude' => ['type' => 'coordinate', 'after' => 'distance_meters'],
                'allowed_radius_meters' => ['type' => 'integer', 'after' => 'distance_meters'],
                'rejection_reason' => ['type' => 'string', 'after' => 'failure_reason'],
            ] as $column => $definition) {
                if (! Schema::hasColumn('attendance_attempt_logs', $column)) {
                    if ($definition['type'] === 'integer') {
                        $table->unsignedInteger($column)->nullable()->after($definition['after']);
                    } elseif ($definition['type'] === 'string') {
                        $table->string($column)->nullable()->after($definition['after']);
                    } elseif ($definition['type'] === 'coordinate') {
                        $table->decimal($column, 10, 7)->nullable()->after($definition['after']);
                    } else {
                        $table->decimal($column, 10, 2)->nullable()->after($definition['after']);
                    }
                }
            }
        });

        if (Schema::hasTable('office_locations')) {
            DB::table('office_locations')
                ->where('name', 'Main Office')
                ->orWhere(function ($query) {
                    $query->where('latitude', 0)->where('longitude', 0);
                })
                ->update([
                    'name' => 'Main Office',
                    'latitude' => 0,
                    'longitude' => 0,
                    'allowed_radius_meters' => 150,
                    'updated_at' => now(),
                ]);
        }

        if (Schema::hasTable('settings')) {
            foreach ([
                ['key' => 'attendance_office_name', 'value' => 'Main Office', 'type' => 'string'],
                ['key' => 'attendance_office_latitude', 'value' => '0', 'type' => 'number'],
                ['key' => 'attendance_office_longitude', 'value' => '0', 'type' => 'number'],
                ['key' => 'attendance_allowed_radius_meters', 'value' => '150', 'type' => 'number'],
            ] as $setting) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $setting['key']],
                    ['value' => $setting['value'], 'type' => $setting['type'], 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::table('attendance_attempt_logs', function (Blueprint $table) {
            foreach (['gps_accuracy_meters', 'office_latitude', 'office_longitude', 'allowed_radius_meters', 'rejection_reason'] as $column) {
                if (Schema::hasColumn('attendance_attempt_logs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('attendances', function (Blueprint $table) {
            foreach (['check_in_office_latitude', 'check_in_office_longitude', 'check_in_allowed_radius_meters', 'check_in_gps_accuracy_meters', 'check_out_office_latitude', 'check_out_office_longitude', 'check_out_allowed_radius_meters', 'check_out_gps_accuracy_meters'] as $column) {
                if (Schema::hasColumn('attendances', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
