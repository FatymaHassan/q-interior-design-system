<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = ['project_id', 'title', 'file_path', 'file_type', 'file_content', 'file_size', 'document_category', 'visibility', 'uploaded_by'];

    protected $hidden = ['file_content'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
