<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $appends = ['has_portal_access'];

    protected $fillable = [
        'name',
        'phone',
        'email',
        'portal_password',
        'portal_token',
        'portal_token_hash',
        'portal_token_expires_at',
        'portal_last_login_at',
        'address',
        'location',
        'notes',
    ];

    protected $hidden = [
        'portal_password',
        'portal_token',
        'portal_token_hash',
    ];

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    public function quotations()
    {
        return $this->hasMany(Quotation::class);
    }

    public function getHasPortalAccessAttribute(): bool
    {
        return ! empty($this->portal_password);
    }

    protected function casts(): array
    {
        return [
            'portal_token_expires_at' => 'datetime',
            'portal_last_login_at' => 'datetime',
        ];
    }
}
