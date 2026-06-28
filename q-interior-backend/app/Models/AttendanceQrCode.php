<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceQrCode extends Model
{
    protected $fillable = ['office_location_id', 'token_hash', 'valid_from', 'valid_until', 'status', 'created_by'];

    protected function casts(): array
    {
        return [
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
        ];
    }

    public function officeLocation()
    {
        return $this->belongsTo(OfficeLocation::class);
    }
}
