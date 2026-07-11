<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_attachments', function (Blueprint $table) {
            if (! Schema::hasColumn('quotation_attachments', 'file_content')) {
                $table->longText('file_content')->nullable()->after('file_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quotation_attachments', function (Blueprint $table) {
            if (Schema::hasColumn('quotation_attachments', 'file_content')) {
                $table->dropColumn('file_content');
            }
        });
    }
};
