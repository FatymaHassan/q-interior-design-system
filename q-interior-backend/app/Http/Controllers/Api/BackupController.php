<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Backup;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

class BackupController extends Controller
{
    public function index()
    {
        return Backup::with('creator:id,name,email')->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'backup_type' => 'nullable|in:database,files,full',
        ]);

        $backup = Backup::create([
            'backup_type' => $data['backup_type'] ?? 'full',
            'status' => 'Running',
            'created_by' => $request->user()?->id,
        ]);

        try {
            $path = 'backups/q-interior-' . $backup->backup_type . '-' . now()->format('Ymd-His') . '.json';
            $payload = [
                'app' => config('app.name'),
                'backup_type' => $backup->backup_type,
                'created_at' => now()->toISOString(),
                'database_connection' => config('database.default'),
                'storage_root' => storage_path('app'),
                'note' => 'Local backup manifest. Replace with mysqldump/cloud storage when production storage is configured.',
            ];

            Storage::disk('local')->put($path, json_encode($payload, JSON_PRETTY_PRINT));

            $backup->update([
                'file_path' => $path,
                'file_size' => Storage::disk('local')->size($path),
                'status' => 'Success',
                'error_message' => null,
            ]);

            Notification::create([
                'user_id' => $request->user()?->id,
                'title' => 'Backup completed',
                'message' => 'A ' . $backup->backup_type . ' backup was created successfully.',
                'type' => 'system_backup',
                'priority' => 'normal',
                'module' => 'backup',
                'record_id' => $backup->id,
                'link' => '/settings',
            ]);

            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'backup_created',
                'module' => 'backup',
                'record_type' => Backup::class,
                'record_id' => $backup->id,
                'new_values' => $backup->fresh()->toArray(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        } catch (Throwable $exception) {
            $backup->update([
                'status' => 'Failed',
                'error_message' => $exception->getMessage(),
            ]);

            Notification::create([
                'user_id' => $request->user()?->id,
                'title' => 'Backup failed',
                'message' => $exception->getMessage(),
                'type' => 'system_backup',
                'priority' => 'high',
                'module' => 'backup',
                'record_id' => $backup->id,
                'link' => '/settings',
            ]);
        }

        return $backup->fresh('creator');
    }
}
