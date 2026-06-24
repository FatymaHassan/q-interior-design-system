<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expense_categories', function (Blueprint $table) {
            if (! Schema::hasColumn('expense_categories', 'description')) {
                $table->text('description')->nullable()->after('type');
            }
        });

        Schema::table('expenses', function (Blueprint $table) {
            if (! Schema::hasColumn('expenses', 'unit_cost')) {
                $table->decimal('unit_cost', 12, 2)->nullable()->after('unit_price');
            }
            if (! Schema::hasColumn('expenses', 'total_cost')) {
                $table->decimal('total_cost', 12, 2)->nullable()->after('amount');
            }
            if (! Schema::hasColumn('expenses', 'approval_status')) {
                $table->enum('approval_status', ['Pending', 'Approved', 'Rejected'])->default('Approved')->after('receipt_file');
            }
            if (! Schema::hasColumn('expenses', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('approval_status')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('expenses', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }
        });

        Schema::table('supplier_payments', function (Blueprint $table) {
            if (! Schema::hasColumn('supplier_payments', 'reference_number')) {
                $table->string('reference_number')->nullable()->after('payment_method');
            }
        });

        DB::table('expenses')
            ->whereNull('unit_cost')
            ->update(['unit_cost' => DB::raw('unit_price')]);

        DB::table('expenses')
            ->whereNull('total_cost')
            ->update(['total_cost' => DB::raw('amount')]);
    }

    public function down(): void
    {
        //
    }
};
