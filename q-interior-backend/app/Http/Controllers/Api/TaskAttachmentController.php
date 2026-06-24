<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Http\Request;

class TaskAttachmentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $data = $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $file = $data['file'];
        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'file_path' => $file->store('task-attachments', 'public'),
            'file_type' => $file->getClientMimeType(),
            'uploaded_by' => $request->user()?->id,
        ]);

        return $attachment->load('uploader');
    }

    public function destroy(TaskAttachment $attachment)
    {
        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted successfully']);
    }
}
