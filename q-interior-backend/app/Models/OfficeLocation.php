<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfficeLocation extends Model
{
    protected $fillable = [
        'name',
        'latitude',
        'longitude',
        'allowed_radius_meters',
        'work_start_time',
        'work_end_time',
        'late_threshold_time',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'allowed_radius_meters' => 'integer',
        ];
    }
}
