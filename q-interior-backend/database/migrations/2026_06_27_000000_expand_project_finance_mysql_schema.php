<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'contract_amount')) {
                $table->decimal('contract_amount', 12, 2)->default(0)->after('budget');
            }
            if (! Schema::hasColumn('projects', 'payment_plan_type')) {
                $table->string('payment_plan_type')->default('Deposit + Final Payment')->after('contract_amount');
            }
            if (! Schema::hasColumn('projects', 'deposit_percentage')) {
                $table->decimal('deposit_percentage', 5, 2)->default(50)->after('payment_plan_type');
            }
            if (! Schema::hasColumn('projects', 'deposit_amount')) {
                $table->decimal('deposit_amount', 12, 2)->default(0)->after('deposit_percentage');
            }
            if (! Schema::hasColumn('projects', 'payment_terms')) {
                $table->text('payment_terms')->nullable()->after('deposit_amount');
            }
            if (! Schema::hasColumn('projects', 'paid_amount')) {
                $table->decimal('paid_amount', 12, 2)->default(0)->after('actual_cost');
            }
            if (! Schema::hasColumn('projects', 'remaining_balance')) {
                $table->decimal('remaining_balance', 12, 2)->default(0)->after('paid_amount');
            }
            if (! Schema::hasColumn('projects', 'payment_percentage')) {
                $table->decimal('payment_percentage', 5, 2)->default(0)->after('remaining_balance');
            }
        });

        if (! Schema::hasTable('project_payment_stages')) {
            Schema::create('project_payment_stages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->text('description')->nullable();
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
            if (Schema::hasColumn('invoices', 'client_id')) {
                try {
                    DB::statement('ALTER TABLE invoices MODIFY client_id BIGINT UNSIGNED NULL');
                } catch (Throwable) {
                }
            }
            if (! Schema::hasColumn('invoices', 'internal_reference')) {
                $table->string('internal_reference')->nullable()->after('invoice_number');
            }
            if (! Schema::hasColumn('invoices', 'invoice_type')) {
                $table->string('invoice_type')->default('client')->after('internal_reference');
            }
            if (! Schema::hasColumn('invoices', 'supplier_id')) {
                $table->foreignId('supplier_id')->nullable()->after('client_id')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('invoices', 'payment_stage_id')) {
                $table->foreignId('payment_stage_id')->nullable()->after('project_id')->constrained('project_payment_stages')->nullOnDelete();
            }
            if (! Schema::hasColumn('invoices', 'purchase_order_id')) {
                $table->foreignId('purchase_order_id')->nullable()->after('payment_stage_id')->constrained('purchase_orders')->nullOnDelete();
            }
            if (! Schema::hasColumn('invoices', 'issue_date')) {
                $table->date('issue_date')->nullable()->after('purchase_order_id');
            }
            if (! Schema::hasColumn('invoices', 'paid_amount')) {
                $table->decimal('paid_amount', 12, 2)->default(0)->after('total_amount');
            }
            if (! Schema::hasColumn('invoices', 'balance_due')) {
                $table->decimal('balance_due', 12, 2)->default(0)->after('paid_amount');
            }
            if (! Schema::hasColumn('invoices', 'attachment_file')) {
                $table->string('attachment_file')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('invoices', 'pdf_file')) {
                $table->string('pdf_file')->nullable()->after('attachment_file');
            }
            if (! Schema::hasColumn('invoices', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            if (! Schema::hasColumn('invoice_items', 'unit')) {
                $table->string('unit')->default('Unit')->after('quantity');
            }
            if (! Schema::hasColumn('invoice_items', 'discount')) {
                $table->decimal('discount', 12, 2)->default(0)->after('unit_price');
            }
            if (! Schema::hasColumn('invoice_items', 'tax')) {
                $table->decimal('tax', 12, 2)->default(0)->after('discount');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'payment_stage_id')) {
                $table->foreignId('payment_stage_id')->nullable()->after('supplier_id')->constrained('project_payment_stages')->nullOnDelete();
            }
            if (! Schema::hasColumn('payments', 'invoice_id')) {
                $table->foreignId('invoice_id')->nullable()->after('payment_stage_id')->constrained('invoices')->nullOnDelete();
            }
            if (! Schema::hasColumn('payments', 'receipt_file')) {
                $table->string('receipt_file')->nullable()->after('reference_number');
            }
        });

        DB::table('projects')->where(function ($query) {
            $query->whereNull('contract_amount')->orWhere('contract_amount', 0);
        })->update([
            'contract_amount' => DB::raw('COALESCE(NULLIF(revenue, 0), NULLIF(budget, 0), 0)'),
        ]);

        DB::table('invoices')
            ->select('id', 'invoice_date', 'issue_date', 'total_amount', 'paid_amount')
            ->orderBy('id')
            ->chunkById(100, function ($invoices) {
                foreach ($invoices as $invoice) {
                    DB::table('invoices')->where('id', $invoice->id)->update([
                        'issue_date' => $invoice->issue_date ?: $invoice->invoice_date,
                        'balance_due' => max(0, (float) $invoice->total_amount - (float) $invoice->paid_amount),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_payment_stages');
    }
};
