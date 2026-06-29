<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // Default expense category items are created by ExpenseCategoriesSeeder.
    }

    public function down(): void
    {
        // Keep user-managed category items.
    }
};
