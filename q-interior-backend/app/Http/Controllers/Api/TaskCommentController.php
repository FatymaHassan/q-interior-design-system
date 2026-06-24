<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $data = $request->validate(['comment' => 'required|string']);
        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()?->id,
            'comment' => $data['comment'],
        ]);

        Notification::create([
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'title' => 'New task comment',
            'message' => $task->title,
            'type' => 'task_comment_added',
            'link' => '/tasks/' . $task->id,
            'is_read' => false,
        ]);

        return $comment->load('user');
    }
}
