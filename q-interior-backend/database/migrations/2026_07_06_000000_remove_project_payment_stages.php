<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'payment_stage_id')) {
                try {
                    $table->dropForeign(['payment_stage_id']);
                } catch (Throwable) {
                }
                $table->dropColumn('payment_stage_id');
            }
        });

        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'payment_stage_id')) {
                try {
                    $table->dropForeign(['payment_stage_id']);
                } catch (Throwable) {
                }
                $table->dropColumn('payment_stage_id');
            }
        });

        Schema::dropIfExists('project_payment_stages');
    }

    public function down(): void
    {
        if (! Schema::hasTable('project_payment_stages')) {
            Schema::create('project_payment_stages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('payment_type')->default('percentage');
                $table->decimal('percentage', 5, 2)->default(0);
                $table->decimal('amount', 12, 2)->default(0);
                $table->string('due_condition')->nullable();
                $table->date('due_date')->nullable();
                $table->string('status')->default('Pending');
                $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
                $table->decimal('paid_amount', 12, 2)->default(0);
                $table->decimal('balance', 12, 2)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'payment_stage_id')) {
                $table->foreignId('payment_stage_id')->nullable()->after('project_id')->constrained('project_payment_stages')->nullOnDelete();
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'payment_stage_id')) {
                $table->foreignId('payment_stage_id')->nullable()->after('supplier_id')->constrained('project_payment_stages')->nullOnDelete();
            }
        });
    }
};
