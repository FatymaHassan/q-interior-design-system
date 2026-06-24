<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Material;
use App\Models\MaterialCategory;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_stock_purchase_orders_and_project_material_usage_work(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($user);

        $supplier = Supplier::create([
            'name' => 'Inventory Supplier',
            'category' => 'Lighting',
            'opening_balance' => 50,
            'current_balance' => 50,
            'status' => 'Active',
        ]);

        $category = $this->postJson('/api/material-categories', [
            'name' => 'Lighting',
            'description' => 'Lighting materials',
            'status' => 'Active',
        ])->assertCreated()->json();

        $material = $this->postJson('/api/materials', [
            'code' => 'LED-001',
            'name' => 'LED Strip',
            'material_category_id' => $category['id'],
            'supplier_id' => $supplier->id,
            'unit' => 'Meter',
            'purchase_price' => 3,
            'selling_price' => 5,
            'current_stock' => 5,
            'minimum_stock' => 10,
            'storage_location' => 'Lighting Shelf',
            'status' => 'Active',
        ])->assertCreated()->assertJsonFragment(['name' => 'LED Strip'])->json();

        $this->getJson('/api/inventory/overview')
            ->assertOk()
            ->assertJsonFragment(['low_stock_materials' => 1]);

        $this->postJson('/api/materials/' . $material['id'] . '/stock-in', [
            'quantity' => 10,
            'unit_cost' => 3,
            'notes' => 'Initial stock receipt',
        ])->assertCreated()->assertJsonFragment(['movement_type' => 'Stock In']);

        $this->assertDatabaseHas('materials', ['id' => $material['id'], 'current_stock' => 15]);

        $project = Project::create([
            'client_id' => Client::create(['name' => 'Inventory Client'])->id,
            'name' => 'Inventory Project',
            'project_name' => 'Inventory Project',
            'status' => 'In Progress',
        ]);

        $this->postJson('/api/materials/' . $material['id'] . '/stock-out', [
            'project_id' => $project->id,
            'quantity' => 3,
            'unit_cost' => 3,
            'notes' => 'Used on site',
        ])->assertCreated()->assertJsonFragment(['movement_type' => 'Stock Out']);

        $this->assertDatabaseHas('materials', ['id' => $material['id'], 'current_stock' => 12]);

        $this->getJson('/api/projects/' . $project->id . '/materials-used')
            ->assertOk()
            ->assertJsonFragment(['total_cost' => 9]);

        $this->postJson('/api/materials/' . $material['id'] . '/stock-out', [
            'quantity' => 99,
            'unit_cost' => 3,
        ])->assertUnprocessable();

        $order = $this->postJson('/api/purchase-orders', [
            'supplier_id' => $supplier->id,
            'order_date' => now()->toDateString(),
            'items' => [[
                'material_id' => $material['id'],
                'quantity_ordered' => 5,
                'unit_price' => 4,
            ]],
        ])->assertCreated()->assertJsonFragment(['status' => 'Ordered'])->json();

        $this->postJson('/api/purchase-orders/' . $order['id'] . '/receive')
            ->assertOk()
            ->assertJsonFragment(['status' => 'Received']);

        $this->assertDatabaseHas('materials', ['id' => $material['id'], 'current_stock' => 17]);

        $this->getJson('/api/suppliers/' . $supplier->id . '/balance')
            ->assertOk()
            ->assertJsonFragment(['total_purchases' => 20, 'outstanding_balance' => 70]);
    }
}
