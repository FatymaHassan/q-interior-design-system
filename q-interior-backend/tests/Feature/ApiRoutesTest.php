<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_returns_ok_response(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson([
                'status' => 'ok',
                'app' => 'Q Interior Design System',
            ]);
    }

    public function test_clients_can_be_created_and_listed(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $client = [
            'name' => 'Jane Doe',
            'phone' => '555-1234',
            'email' => 'jane@example.com',
            'location' => 'Nairobi',
            'notes' => 'Kitchen renovation',
        ];

        $this->postJson('/api/clients', $client)
            ->assertCreated()
            ->assertJsonFragment([
                'name' => 'Jane Doe',
                'email' => 'jane@example.com',
            ]);

        $this->getJson('/api/clients')
            ->assertOk()
            ->assertJsonFragment([
                'name' => 'Jane Doe',
                'location' => 'Nairobi',
            ]);
    }
}
