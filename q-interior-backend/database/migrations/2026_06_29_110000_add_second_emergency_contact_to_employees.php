<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'emergency_contact_2_name')) {
                $table->string('emergency_contact_2_name')->nullable()->after('emergency_contact_phone');
            }

            if (! Schema::hasColumn('employees', 'emergency_contact_2_phone')) {
                $table->string('emergency_contact_2_phone')->nullable()->after('emergency_contact_2_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'emergency_contact_2_phone')) {
                $table->dropColumn('emergency_contact_2_phone');
            }

            if (Schema::hasColumn('employees', 'emergency_contact_2_name')) {
                $table->dropColumn('emergency_contact_2_name');
            }
        });
    }
};
