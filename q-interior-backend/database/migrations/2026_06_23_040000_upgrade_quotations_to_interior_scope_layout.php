<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            if (! Schema::hasColumn('quotations', 'project_title')) {
                $table->string('project_title')->nullable()->after('title');
            }
            if (! Schema::hasColumn('quotations', 'client_name')) {
                $table->string('client_name')->nullable()->after('client_id');
            }
            if (! Schema::hasColumn('quotations', 'location')) {
                $table->string('location')->nullable()->after('project_type');
            }
            if (! Schema::hasColumn('quotations', 'profit_percentage')) {
                $table->decimal('profit_percentage', 6, 2)->default(0)->after('tax');
            }
            if (! Schema::hasColumn('quotations', 'profit_amount')) {
                $table->decimal('profit_amount', 12, 2)->default(0)->after('profit_percentage');
            }
            if (! Schema::hasColumn('quotations', 'grand_total')) {
                $table->decimal('grand_total', 12, 2)->default(0)->after('total_amount');
            }
            if (! Schema::hasColumn('quotations', 'payment_account_name')) {
                $table->string('payment_account_name')->nullable()->after('payment_terms');
            }
            if (! Schema::hasColumn('quotations', 'payment_bank')) {
                $table->string('payment_bank')->nullable()->after('payment_account_name');
            }
            if (! Schema::hasColumn('quotations', 'payment_account_no')) {
                $table->string('payment_account_no')->nullable()->after('payment_bank');
            }
            if (! Schema::hasColumn('quotations', 'terms_conditions')) {
                $table->text('terms_conditions')->nullable()->after('scope_exclusions');
            }
            if (! Schema::hasColumn('quotations', 'footer_note')) {
                $table->text('footer_note')->nullable()->after('terms_conditions');
            }
        });

        Schema::create('quotation_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('quotation_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('quotation_section_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            if (! Schema::hasColumn('quotation_items', 'quotation_section_id')) {
                $table->foreignId('quotation_section_id')->nullable()->after('quotation_id')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('quotation_items', 'quotation_room_id')) {
                $table->foreignId('quotation_room_id')->nullable()->after('quotation_section_id')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('quotation_items', 'area_m2')) {
                $table->decimal('area_m2', 10, 2)->nullable()->after('description');
            }
            if (! Schema::hasColumn('quotation_items', 'rate')) {
                $table->decimal('rate', 12, 2)->nullable()->after('area_m2');
            }
            if (! Schema::hasColumn('quotation_items', 'notes')) {
                $table->text('notes')->nullable()->after('total');
            }
            if (! Schema::hasColumn('quotation_items', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('notes');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_rooms');
        Schema::dropIfExists('quotation_sections');
    }
};
