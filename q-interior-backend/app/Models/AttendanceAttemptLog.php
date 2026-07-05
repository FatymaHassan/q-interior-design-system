<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceAttemptLog extends Model
{
    protected $fillable = ['employee_id', 'office_location_id', 'attempt_type', 'latitude', 'longitude', 'distance_meters', 'gps_accuracy_meters', 'office_latitude', 'office_longitude', 'allowed_radius_meters', 'is_location_valid', 'success', 'failure_reason', 'rejection_reason', 'device_info', 'ip_address'];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'distance_meters' => 'decimal:2',
            'gps_accuracy_meters' => 'decimal:2',
            'office_latitude' => 'decimal:7',
            'office_longitude' => 'decimal:7',
            'allowed_radius_meters' => 'integer',
            'is_location_valid' => 'boolean',
            'success' => 'boolean',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function officeLocation()
    {
        return $this->belongsTo(OfficeLocation::class);
    }
}
