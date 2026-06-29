<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'portal_last_login_at')) {
                $table->timestamp('portal_last_login_at')->nullable()->after('portal_token_expires_at');
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'portal_last_login_at')) {
                $table->timestamp('portal_last_login_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'portal_last_login_at')) {
                $table->dropColumn('portal_last_login_at');
            }
        });

        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'portal_last_login_at')) {
                $table->dropColumn('portal_last_login_at');
            }
        });
    }
};
