<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialCategory extends Model
{
    protected $fillable = ['name', 'description', 'status'];

    public function materials()
    {
        return $this->hasMany(Material::class);
    }
}
