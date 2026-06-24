<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            if (! Schema::hasColumn('quotation_items', 'unit_type')) {
                $table->string('unit_type')->default('M²')->after('description');
            }
            if (! Schema::hasColumn('quotation_items', 'is_manual_total')) {
                $table->boolean('is_manual_total')->default(false)->after('total');
            }
        });
    }

    public function down(): void
    {
        //
    }
};
