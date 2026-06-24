<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskStatusHistory extends Model
{
    protected $fillable = ['task_id', 'old_status', 'new_status', 'changed_by', 'note'];

    public function changer()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
