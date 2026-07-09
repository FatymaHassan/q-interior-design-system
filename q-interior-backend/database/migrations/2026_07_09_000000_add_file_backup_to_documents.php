<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (! Schema::hasColumn('documents', 'file_content')) {
                $table->longText('file_content')->nullable()->after('file_type');
            }
            if (! Schema::hasColumn('documents', 'file_size')) {
                $table->unsignedBigInteger('file_size')->nullable()->after('file_content');
            }
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (Schema::hasColumn('documents', 'file_size')) {
                $table->dropColumn('file_size');
            }
            if (Schema::hasColumn('documents', 'file_content')) {
                $table->dropColumn('file_content');
            }
        });
    }
};
