<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Payment;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\Supplier;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PhaseSevenOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_exports_backup_audit_and_automation_work(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($user);

        $client = Client::create(['name' => 'Phase Seven Client', 'email' => 'phase7@example.com']);
        $project = Project::create(['client_id' => $client->id, 'name' => 'Phase Seven Project', 'project_name' => 'Phase Seven Project', 'status' => 'In Progress', 'budget' => 1000, 'actual_cost' => 300, 'progress' => 40]);
        $supplier = Supplier::create(['name' => 'Phase Seven Supplier', 'balance' => 25, 'current_balance' => 25, 'status' => 'Active']);
        Payment::create(['project_id' => $project->id, 'client_id' => $client->id, 'type' => 'client', 'amount' => 800, 'payment_date' => now()->toDateString(), 'status' => 'paid']);
        Expense::create(['project_id' => $project->id, 'supplier_id' => $supplier->id, 'title' => 'Phase Seven Expense', 'category' => 'Materials', 'amount' => 200, 'expense_date' => now()->toDateString()]);
        Invoice::create(['invoice_number' => 'INV-P7', 'client_id' => $client->id, 'project_id' => $project->id, 'invoice_date' => now()->subDays(10), 'due_date' => now()->subDay(), 'total_amount' => 500, 'status' => 'Unpaid']);
        Quotation::create(['quotation_number' => 'QT-P7', 'client_id' => $client->id, 'title' => 'Expired Quote', 'valid_until' => now()->subDay(), 'grand_total' => 700, 'status' => 'Sent']);
        Task::create(['project_id' => $project->id, 'assigned_to' => $user->id, 'title' => 'Overdue Task', 'status' => 'Pending', 'deadline' => now()->subDay()]);
        $category = MaterialCategory::create(['name' => 'Phase Seven Materials', 'status' => 'Active']);
        Material::create(['material_category_id' => $category->id, 'supplier_id' => $supplier->id, 'name' => 'Low Stock Material', 'unit' => 'Piece', 'purchase_price' => 2, 'current_stock' => 1, 'minimum_stock' => 5, 'status' => 'Active']);

        $this->getJson('/api/dashboard/executive')->assertOk()->assertJsonPath('kpis.total_revenue', 800);
        $this->getJson('/api/reports')->assertOk()->assertJsonFragment(['title' => 'Profit & Loss Report']);
        $this->getJson('/api/reports/profit-loss')->assertOk()->assertJsonFragment(['revenue' => 800]);
        $this->get('/api/reports/profit-loss/export?format=pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->postJson('/api/backups', ['backup_type' => 'full'])->assertOk()->assertJsonFragment(['status' => 'Success']);
        $this->getJson('/api/audit-logs')->assertOk()->assertJsonFragment(['action' => 'backup_created']);

        Artisan::call('q:check-overdue-invoices');
        Artisan::call('q:check-overdue-tasks');
        Artisan::call('q:check-expired-quotations');
        Artisan::call('q:check-low-stock-materials');

        $this->assertDatabaseHas('invoices', ['invoice_number' => 'INV-P7', 'status' => 'Overdue']);
        $this->assertDatabaseHas('tasks', ['title' => 'Overdue Task', 'status' => 'Overdue']);
        $this->assertDatabaseHas('quotations', ['quotation_number' => 'QT-P7', 'status' => 'Expired']);
        $this->assertDatabaseHas('notifications', ['type' => 'low_stock']);
    }
}
