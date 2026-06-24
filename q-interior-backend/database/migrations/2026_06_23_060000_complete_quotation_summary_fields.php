<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            if (! Schema::hasColumn('quotations', 'total_discount')) {
                $table->decimal('total_discount', 12, 2)->default(0)->after('subtotal');
            }
            if (! Schema::hasColumn('quotations', 'total_tax')) {
                $table->decimal('total_tax', 12, 2)->default(0)->after('total_discount');
            }
            if (! Schema::hasColumn('quotations', 'sent_by')) {
                $table->foreignId('sent_by')->nullable()->after('sent_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('quotations', 'payment_phone')) {
                $table->string('payment_phone')->nullable()->after('payment_account_no');
            }
            if (! Schema::hasColumn('quotations', 'payment_notes')) {
                $table->text('payment_notes')->nullable()->after('payment_phone');
            }
        });

        Schema::table('quotation_versions', function (Blueprint $table) {
            if (! Schema::hasColumn('quotation_versions', 'total_discount')) {
                $table->decimal('total_discount', 12, 2)->default(0)->after('subtotal');
            }
            if (! Schema::hasColumn('quotation_versions', 'total_tax')) {
                $table->decimal('total_tax', 12, 2)->default(0)->after('total_discount');
            }
            if (! Schema::hasColumn('quotation_versions', 'profit_percentage')) {
                $table->decimal('profit_percentage', 6, 2)->default(0)->after('tax');
            }
            if (! Schema::hasColumn('quotation_versions', 'profit_amount')) {
                $table->decimal('profit_amount', 12, 2)->default(0)->after('profit_percentage');
            }
            if (! Schema::hasColumn('quotation_versions', 'grand_total')) {
                $table->decimal('grand_total', 12, 2)->default(0)->after('total_amount');
            }
        });
    }

    public function down(): void
    {
        //
    }
};
