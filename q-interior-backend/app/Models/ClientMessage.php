<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientMessage extends Model
{
    protected $fillable = ['project_id', 'client_id', 'user_id', 'sender_type', 'message', 'attachment', 'is_read'];

    protected $casts = ['is_read' => 'boolean'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
