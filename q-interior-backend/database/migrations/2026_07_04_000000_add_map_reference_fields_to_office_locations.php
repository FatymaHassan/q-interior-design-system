<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('office_locations', function (Blueprint $table) {
            if (! Schema::hasColumn('office_locations', 'map_code')) {
                $table->string('map_code')->nullable()->after('name');
            }

            if (! Schema::hasColumn('office_locations', 'address')) {
                $table->string('address')->nullable()->after('map_code');
            }

            if (! Schema::hasColumn('office_locations', 'map_url')) {
                $table->text('map_url')->nullable()->after('address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('office_locations', function (Blueprint $table) {
            foreach (['map_url', 'address', 'map_code'] as $column) {
                if (Schema::hasColumn('office_locations', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
