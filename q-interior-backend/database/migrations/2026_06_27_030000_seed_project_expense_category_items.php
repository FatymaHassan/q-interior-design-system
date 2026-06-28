<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach ($this->items() as $group => $items) {
            foreach ($items as $item) {
                DB::table('expense_categories')->updateOrInsert(
                    ['name' => $item, 'expense_type' => 'project'],
                    [
                        'type' => 'project_expense',
                        'group_name' => $group,
                        'description' => $group . ' item',
                        'status' => 'Active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        // Keep user-managed category items.
    }

    private function items(): array
    {
        return [
            'Design Costs' => ['Site Visit', '3D Design', 'Printing Drawings', 'Measurements'],
            'Materials' => ['Paint', 'Gypsum', 'Tiles', 'Lighting', 'Furniture'],
            'Labour Costs' => ['Carpenter', 'Painter', 'Electrician', 'Mason'],
            'Site Expenses' => ['Transport', 'Fuel', 'Food for Workers', 'Equipment Rental'],
            'Other Project Costs' => ['Other'],
        ];
    }
};
