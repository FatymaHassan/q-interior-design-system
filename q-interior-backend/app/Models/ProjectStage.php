<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectStage extends Model
{
    protected $fillable = ['name', 'order', 'color'];

    public function projects()
    {
        return $this->hasMany(Project::class);
    }
}
