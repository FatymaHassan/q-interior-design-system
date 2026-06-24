<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Backup;
use App\Models\Invoice;
use App\Models\Material;
use App\Models\Notification;
use App\Models\Quotation;
use App\Models\Task;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('q:check-overdue-invoices', function () {
    $count = Invoice::whereDate('due_date', '<', now())->whereNotIn('status', ['Paid', 'Cancelled', 'Overdue'])->update(['status' => 'Overdue']);
    if ($count > 0) {
        Notification::create(['title' => 'Overdue invoices found', 'message' => $count . ' invoice(s) were marked overdue.', 'type' => 'invoice_overdue', 'priority' => 'high', 'module' => 'finance', 'link' => '/reports']);
    }
    $this->info($count . ' overdue invoice(s) processed.');
})->purpose('Mark unpaid invoices overdue and notify finance.');

Artisan::command('q:check-overdue-tasks', function () {
    $tasks = Task::whereDate('deadline', '<', now())->whereNotIn('status', ['Done', 'Completed', 'Overdue'])->get();
    foreach ($tasks as $task) {
        $task->update(['status' => 'Overdue']);
        Notification::create(['user_id' => $task->assigned_to, 'project_id' => $task->project_id, 'task_id' => $task->id, 'title' => 'Task overdue', 'message' => $task->title . ' is overdue.', 'type' => 'task_overdue', 'priority' => 'high', 'module' => 'tasks', 'record_id' => $task->id, 'link' => '/tasks/' . $task->id]);
    }
    $this->info($tasks->count() . ' overdue task(s) processed.');
})->purpose('Mark tasks overdue and notify assigned staff.');

Artisan::command('q:check-expired-quotations', function () {
    $count = Quotation::whereDate('valid_until', '<', now())->whereNotIn('status', ['Approved', 'Rejected', 'Expired'])->update(['status' => 'Expired']);
    if ($count > 0) {
        Notification::create(['title' => 'Expired quotations found', 'message' => $count . ' quotation(s) were marked expired.', 'type' => 'quotation_expired', 'priority' => 'normal', 'module' => 'quotations', 'link' => '/quotations']);
    }
    $this->info($count . ' expired quotation(s) processed.');
})->purpose('Mark quotations expired after valid-until date.');

Artisan::command('q:check-low-stock-materials', function () {
    $materials = Material::all()->filter(fn ($material) => $material->stock_status !== 'In Stock');
    foreach ($materials as $material) {
        Notification::firstOrCreate(
            ['type' => 'low_stock', 'module' => 'inventory', 'record_id' => $material->id, 'is_read' => false],
            ['title' => $material->stock_status . ': ' . $material->name, 'message' => $material->name . ' stock is ' . $material->current_stock . ' ' . $material->unit . '.', 'priority' => $material->stock_status === 'Out of Stock' ? 'high' : 'normal', 'link' => '/inventory']
        );
    }
    $this->info($materials->count() . ' low-stock material(s) checked.');
})->purpose('Notify about low and out-of-stock inventory.');

Artisan::command('q:check-missing-attendance', function () {
    $missing = DB::table('employees')->where('status', 'Active')->whereNotExists(function ($query) {
        $query->select(DB::raw(1))->from('attendances')->whereColumn('attendances.employee_id', 'employees.id')->whereDate('attendances.date', today());
    })->count();
    if ($missing > 0) {
        Notification::create(['title' => 'Missing attendance', 'message' => $missing . ' active employee(s) have no attendance for today.', 'type' => 'missing_attendance', 'priority' => 'normal', 'module' => 'hr', 'link' => '/hr']);
    }
    $this->info($missing . ' missing attendance record(s) found.');
})->purpose('Notify HR about missing daily attendance.');

Artisan::command('q:run-daily-backup', function () {
    $backup = Backup::create(['backup_type' => 'full', 'status' => 'Success', 'file_path' => 'scheduled-backup-' . now()->format('Ymd-His') . '.json']);
    Notification::create(['title' => 'Daily backup completed', 'message' => 'Scheduled backup #' . $backup->id . ' completed.', 'type' => 'system_backup', 'priority' => 'normal', 'module' => 'backup', 'record_id' => $backup->id, 'link' => '/settings']);
    $this->info('Daily backup recorded.');
})->purpose('Record a scheduled local backup entry.');

Artisan::command('q:send-daily-summary', function () {
    Notification::create(['title' => 'Daily summary ready', 'message' => 'Review dashboard, overdue tasks, low stock, and pending approvals.', 'type' => 'daily_summary', 'priority' => 'normal', 'module' => 'dashboard', 'link' => '/dashboard']);
    $this->info('Daily summary notification created.');
})->purpose('Create daily management summary notification.');

Schedule::command('q:check-overdue-invoices')->daily();
Schedule::command('q:check-overdue-tasks')->hourly();
Schedule::command('q:check-expired-quotations')->daily();
Schedule::command('q:check-low-stock-materials')->daily();
Schedule::command('q:check-missing-attendance')->dailyAt('18:00');
Schedule::command('q:run-daily-backup')->dailyAt('23:00');
Schedule::command('q:send-daily-summary')->dailyAt('18:30');
