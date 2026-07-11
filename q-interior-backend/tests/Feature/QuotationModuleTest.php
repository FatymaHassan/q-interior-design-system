<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuotationModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_structured_interior_quotation_calculates_profit_and_grand_total(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $client = Client::create(['name' => 'Ali Ahmed', 'email' => 'ali@example.com']);

        $quotation = $this->postJson('/api/quotations', [
            'client_id' => $client->id,
            'title' => 'Ali VILLA HOUSE',
            'project_title' => 'Ali VILLA HOUSE',
            'client_name' => 'Ali Ahmed',
            'location' => 'Mogadishu',
            'quotation_date' => '2026-05-28',
            'profit_percentage' => 8,
            'payment_terms' => "60% advance upon agreement\n30% upon progress payment\n10% final payment",
            'sections' => [[
                'title' => 'GROUND FLOOR',
                'rooms' => [[
                    'title' => 'Living Room',
                    'items' => [
                        ['description' => 'Wall Decoration', 'unit_type' => 'M²', 'quantity' => 51, 'rate' => 60, 'discount' => 10, 'tax' => 20],
                        ['description' => 'Door Handle', 'unit_type' => 'Piece', 'quantity' => 10, 'rate' => 5],
                        ['description' => 'Labor Work', 'unit_type' => 'Day', 'quantity' => 5, 'rate' => 30],
                        ['description' => 'Installation', 'unit_type' => 'Lump Sum', 'quantity' => 1, 'rate' => 500],
                        ['description' => 'Special Decor Package', 'unit_type' => 'Custom', 'quantity' => 0, 'rate' => 0, 'total' => 750, 'is_manual_total' => true],
                    ],
                ]],
            ]],
        ])
            ->assertCreated()
            ->assertJsonFragment(['project_title' => 'Ali VILLA HOUSE'])
            ->json();

        $this->assertDatabaseHas('quotation_sections', ['quotation_id' => $quotation['id'], 'title' => 'GROUND FLOOR']);
        $this->assertDatabaseHas('quotation_rooms', ['quotation_id' => $quotation['id'], 'title' => 'Living Room']);
        $this->assertDatabaseHas('quotations', [
            'id' => $quotation['id'],
            'subtotal' => 4520,
            'total_discount' => 10,
            'total_tax' => 20,
            'profit_amount' => 361.6,
            'grand_total' => 4881.6,
        ]);
        $this->assertDatabaseHas('quotation_items', ['description' => 'Door Handle', 'unit_type' => 'Piece', 'quantity' => 10, 'total' => 50]);
        $this->assertDatabaseHas('quotation_items', ['description' => 'Installation', 'unit_type' => 'Lump Sum', 'quantity' => 1, 'total' => 500]);
        $this->assertDatabaseHas('quotation_items', ['description' => 'Special Decor Package', 'unit_type' => 'Custom', 'is_manual_total' => true, 'total' => 750]);

        $this->getJson('/api/reports/quotations')
            ->assertOk()
            ->assertJsonFragment(['pipeline_value' => 4881.6]);
    }

    public function test_quotation_can_be_sent_approved_and_converted(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $client = Client::create([
            'name' => 'Amina Quote Client',
            'email' => 'amina.quote@example.com',
            'phone' => '555-0000',
            'portal_password' => Hash::make('password'),
        ]);

        $quotation = $this->postJson('/api/quotations', [
            'client_id' => $client->id,
            'title' => 'Apartment styling quotation',
            'quotation_date' => now()->toDateString(),
            'valid_until' => now()->addDays(10)->toDateString(),
            'payment_terms' => '50% deposit, balance on completion.',
            'items' => [
                ['description' => 'Design package', 'quantity' => 1, 'unit_price' => 800, 'discount' => 0, 'tax' => 0],
                ['description' => 'Furniture sourcing', 'quantity' => 2, 'unit_price' => 500, 'discount' => 100, 'tax' => 0],
            ],
        ])
            ->assertCreated()
            ->assertJsonFragment(['title' => 'Apartment styling quotation'])
            ->json();

        $this->postJson('/api/quotations/' . $quotation['id'] . '/send')
            ->assertOk()
            ->assertJsonFragment(['status' => 'Sent']);

        $staffToken = $user->createToken('pdf-test')->plainTextToken;
        $this->get('/api/quotations/' . $quotation['id'] . '/pdf?token=' . urlencode($staffToken))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('content-disposition', 'attachment; filename="' . $quotation['quotation_number'] . '.pdf"');

        $token = 'client-test-token';
        $client->update([
            'portal_token_hash' => hash('sha256', $token),
            'portal_token_expires_at' => now()->addHour(),
        ]);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/client-portal/quotations/' . $quotation['id'] . '/approve', [
                'signed_name' => 'Amina Quote Client',
                'client_comment' => 'Approved for work start.',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'Approved']);

        $this->assertDatabaseHas('quotations', ['id' => $quotation['id'], 'status' => 'Approved']);
        $this->assertSame(1, Project::count());
        $this->assertSame(1, Invoice::count());
        $this->assertSame('Apartment styling quotation', Quotation::first()->project->name);
    }

    public function test_quotation_can_be_recorded_without_existing_client_or_project(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $quotation = $this->postJson('/api/quotations', [
            'client_id' => null,
            'project_id' => null,
            'title' => 'Walk-in office quotation',
            'project_title' => 'Walk-in office quotation',
            'client_name' => 'New Walk-in Client',
            'quotation_date' => now()->toDateString(),
            'sections' => [[
                'title' => 'GROUND FLOOR',
                'rooms' => [[
                    'title' => 'Reception',
                    'items' => [
                        ['description' => 'Concept design', 'unit_type' => 'Lump Sum', 'quantity' => 1, 'rate' => 250],
                    ],
                ]],
            ]],
        ])
            ->assertCreated()
            ->assertJsonFragment(['client_name' => 'New Walk-in Client'])
            ->json();

        $this->assertDatabaseHas('quotations', [
            'id' => $quotation['id'],
            'client_id' => null,
            'project_id' => null,
            'status' => 'Draft',
        ]);

        $this->postJson('/api/quotations/' . $quotation['id'] . '/reject', [
            'client_comment' => 'Client chose another supplier.',
        ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'Rejected']);

        $this->postJson('/api/quotations/' . $quotation['id'] . '/approve', [
            'client_comment' => 'Client came back and approved.',
        ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'Approved']);
    }

    public function test_downloaded_pdf_paginates_all_items_and_reconciles_totals(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $items = collect(range(1, 35))->map(fn (int $number) => [
            'description' => 'Complete scope line ' . str_pad((string) $number, 2, '0', STR_PAD_LEFT),
            'quantity' => 2,
            'unit_price' => 10,
            'discount' => 0,
            'tax' => 0,
        ])->all();

        $quotation = $this->postJson('/api/quotations', [
            'title' => 'Long complete quotation',
            'quotation_date' => now()->toDateString(),
            'profit_percentage' => 10,
            'items' => $items,
        ])->assertCreated()->json();

        // Simulate totals left stale by an older application version.
        Quotation::findOrFail($quotation['id'])->update([
            'subtotal' => 1,
            'profit_amount' => 1,
            'grand_total' => 2,
            'total_amount' => 2,
        ]);

        $token = $user->createToken('long-pdf-test')->plainTextToken;
        $response = $this->get('/api/quotations/' . $quotation['id'] . '/pdf?token=' . urlencode($token))
            ->assertOk();
        $pdf = $response->getContent();

        preg_match('/\/Count (\d+)/', $pdf, $pageMatch);
        $this->assertGreaterThanOrEqual(2, (int) ($pageMatch[1] ?? 0));
        $this->assertStringContainsString('Complete scope line 01', $pdf);
        $this->assertStringContainsString('Complete scope line 35', $pdf);
        preg_match_all('/\/Contents (\d+) 0 R/', $pdf, $contentMatches);
        $pageStreams = [];
        foreach ($contentMatches[1] as $contentObjectId) {
            preg_match('/' . $contentObjectId . ' 0 obj << \/Length \d+ >> stream\n(.*?)\nendstream/s', $pdf, $streamMatch);
            $pageStreams[] = $streamMatch[1] ?? '';
        }
        $this->assertStringNotContainsString('Complete scope line 35', $pageStreams[0]);
        $this->assertTrue(collect(array_slice($pageStreams, 1))->contains(
            fn (string $stream) => str_contains($stream, 'Complete scope line 35')
        ));
        $this->assertStringContainsString('Subtotal', $pdf);
        $this->assertStringContainsString('$700.00', $pdf);
        $this->assertStringContainsString('$770.00', $pdf);
        $this->assertDatabaseHas('quotations', [
            'id' => $quotation['id'],
            'subtotal' => 700,
            'profit_amount' => 70,
            'grand_total' => 770,
        ]);
    }

    public function test_uploaded_quotation_image_appears_in_preview_pdf_and_file_endpoint(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $quotation = $this->postJson('/api/quotations', [
            'title' => 'Quotation image visibility test',
            'quotation_date' => now()->toDateString(),
            'sections' => [[
                'title' => 'FURNITURE',
                'rooms' => [[
                    'title' => 'Living Room',
                    'items' => [[
                        'description' => 'Dining chair',
                        'unit_type' => 'Unit',
                        'quantity' => 1,
                        'rate' => 120,
                    ]],
                ]],
            ]],
        ])->assertCreated()->json();

        $imageContent = file_get_contents(public_path('images/q-interior-logo.jpeg'));
        $attachment = $this->post('/api/quotations/' . $quotation['id'] . '/attachments', [
            'title' => 'QI_SCOPE|item|0|0|0|Dining chair|1',
            'visibility' => 'client',
            'file' => UploadedFile::fake()->createWithContent('chair.jpg', $imageContent),
        ])->assertCreated()->json();

        $this->assertDatabaseHas('quotation_attachments', ['id' => $attachment['id']]);
        $this->assertNotEmpty(\App\Models\QuotationAttachment::findOrFail($attachment['id'])->file_content);

        $this->get('/api/quotations/' . $quotation['id'] . '/attachments/' . $attachment['id'] . '/file')
            ->assertOk()
            ->assertHeader('content-disposition', 'inline; filename="' . basename($attachment['file_path']) . '"');

        $this->get('/api/quotations/' . $quotation['id'] . '/preview')
            ->assertOk()
            ->assertSee('data:image/jpeg;base64,', false)
            ->assertSee('Dining chair');

        $pdfResponse = $this->get('/api/quotations/' . $quotation['id'] . '/pdf')
            ->assertOk()
            ->assertSee('/Subtype /Image', false)
            ->assertSee('Dining chair');
        $this->assertStringContainsString('/Count 1', $pdfResponse->getContent());
    }
}
