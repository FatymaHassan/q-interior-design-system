<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_payment_stages', function (Blueprint $table) {
            if (! Schema::hasColumn('project_payment_stages', 'payment_type')) {
                $table->string('payment_type')->default('percentage')->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('project_payment_stages', function (Blueprint $table) {
            if (Schema::hasColumn('project_payment_stages', 'payment_type')) {
                $table->dropColumn('payment_type');
            }
        });
    }
};
