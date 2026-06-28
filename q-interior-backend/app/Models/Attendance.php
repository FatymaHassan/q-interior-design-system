<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = ['employee_id', 'office_location_id', 'date', 'check_in', 'check_out', 'total_hours', 'status', 'method', 'check_in_latitude', 'check_in_longitude', 'check_out_latitude', 'check_out_longitude', 'check_in_distance_meters', 'check_out_distance_meters', 'late_minutes', 'notes', 'device_info', 'created_by'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'total_hours' => 'decimal:2',
            'check_in_latitude' => 'decimal:7',
            'check_in_longitude' => 'decimal:7',
            'check_out_latitude' => 'decimal:7',
            'check_out_longitude' => 'decimal:7',
            'check_in_distance_meters' => 'decimal:2',
            'check_out_distance_meters' => 'decimal:2',
            'late_minutes' => 'integer',
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
