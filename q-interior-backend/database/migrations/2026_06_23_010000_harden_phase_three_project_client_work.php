<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'portal_token_hash')) {
                $table->string('portal_token_hash', 64)->nullable()->unique()->after('portal_token');
            }
            if (! Schema::hasColumn('clients', 'portal_token_expires_at')) {
                $table->timestamp('portal_token_expires_at')->nullable()->after('portal_token_hash');
            }
        });

        Schema::table('notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('notifications', 'project_id')) {
                $table->foreignId('project_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('notifications', 'task_id')) {
                $table->foreignId('task_id')->nullable()->after('project_id')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('notifications', 'link')) {
                $table->string('link')->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_status_histories');
    }
};
