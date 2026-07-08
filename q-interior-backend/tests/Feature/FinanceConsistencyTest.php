<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_finance_dashboard_supplier_payment_and_client_portal_stay_consistent(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $client = Client::create([
            'name' => 'Finance Client',
            'phone' => '611000001',
            'email' => 'finance-client@example.com',
        ]);
        $supplier = Supplier::create([
            'name' => 'Material Supplier',
            'phone' => '611000002',
            'email' => 'supplier@example.com',
            'opening_balance' => 0,
        ]);

        $project = $this->postJson('/api/projects', [
            'client_id' => $client->id,
            'name' => 'Finance Test Project',
            'budget' => 1000,
            'total_quotation' => 1000,
            'profit_percentage' => 20,
            'contract_amount' => 1200,
            'deposit_percentage' => 25,
            'status' => 'Active',
        ])->assertCreated()->json();

        $this->postJson('/api/payments', [
            'project_id' => $project['id'],
            'client_id' => $client->id,
            'type' => 'client',
            'amount' => 300.50,
            'status' => 'paid',
            'payment_date' => now()->toDateString(),
        ])->assertSuccessful();

        $this->postJson('/api/expenses', [
            'project_id' => $project['id'],
            'supplier_id' => $supplier->id,
            'expense_type' => 'project',
            'title' => 'Approved project material',
            'quantity' => 2,
            'unit_cost' => 50.25,
            'total_cost' => 100.50,
            'is_manual_total' => true,
            'approval_status' => 'Approved',
            'expense_date' => now()->toDateString(),
        ])->assertSuccessful();

        $invoice = $this->postJson('/api/invoices', [
            'invoice_type' => 'client',
            'client_id' => $client->id,
            'invoice_date' => now()->toDateString(),
            'items' => [
                ['description' => 'Invoice line', 'quantity' => 1, 'unit_price' => 100],
            ],
        ])->assertSuccessful()->json();

        $this->postJson('/api/payments', [
            'client_id' => $client->id,
            'invoice_id' => $invoice['id'],
            'type' => 'client',
            'amount' => 40,
            'status' => 'paid',
            'payment_date' => now()->toDateString(),
        ])->assertSuccessful();

        $this->postJson('/api/payments', [
            'supplier_id' => $supplier->id,
            'type' => 'supplier',
            'amount' => 200,
            'status' => 'paid',
            'payment_date' => now()->toDateString(),
        ])->assertSuccessful();

        $project = Project::findOrFail($project['id']);
        $this->assertSame(1200.0, (float) $project->contract_amount);
        $this->assertSame(300.5, (float) $project->paid_amount);
        $this->assertSame(100.5, (float) $project->actual_cost);
        $this->assertSame(1099.5, (float) $project->expected_profit);
        $this->assertSame(200.0, (float) $project->actual_profit);
        $this->assertSame(25.04, (float) $project->payment_percentage);
        $this->assertSame(91.63, (float) $project->profit_margin);

        $this->getJson('/api/invoices/' . $invoice['id'])
            ->assertOk()
            ->assertJsonFragment(['status' => 'Partially Paid']);

        $this->getJson('/api/dashboard/summary')
            ->assertOk()
            ->assertJsonFragment([
                'total_revenue' => 340.5,
                'total_project_expenses' => 100.5,
            ]);

        $this->postJson('/api/clients', [
            'name' => 'Portal Client',
            'phone' => '611000003',
            'email' => 'portal-client@example.com',
            'portal_password' => 'secret123',
            'portal_password_confirmation' => 'secret123',
        ])->assertCreated();

        $this->postJson('/api/client-portal/login', [
            'email' => 'portal-client@example.com',
            'password' => 'secret123',
        ])->assertOk()->assertJsonStructure(['token']);
    }
}
