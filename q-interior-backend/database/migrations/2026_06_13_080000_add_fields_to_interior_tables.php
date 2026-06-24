<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'name')) {
                $table->string('name')->nullable();
            }

            if (! Schema::hasColumn('clients', 'phone')) {
                $table->string('phone')->nullable();
            }

            if (! Schema::hasColumn('clients', 'email')) {
                $table->string('email')->nullable();
            }

            if (! Schema::hasColumn('clients', 'location')) {
                $table->string('location')->nullable();
            }

            if (! Schema::hasColumn('clients', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'client_id')) {
                $table->unsignedBigInteger('client_id')->nullable();
            }

            if (! Schema::hasColumn('projects', 'project_name')) {
                $table->string('project_name')->nullable();
            }

            if (! Schema::hasColumn('projects', 'location')) {
                $table->string('location')->nullable();
            }

            if (! Schema::hasColumn('projects', 'start_date')) {
                $table->date('start_date')->nullable();
            }

            if (! Schema::hasColumn('projects', 'end_date')) {
                $table->date('end_date')->nullable();
            }

            if (! Schema::hasColumn('projects', 'budget')) {
                $table->decimal('budget', 12, 2)->default(0);
            }

            if (! Schema::hasColumn('projects', 'actual_cost')) {
                $table->decimal('actual_cost', 12, 2)->default(0);
            }

            if (! Schema::hasColumn('projects', 'progress')) {
                $table->unsignedTinyInteger('progress')->default(0);
            }

            if (! Schema::hasColumn('projects', 'status')) {
                $table->string('status')->default('pending');
            }

            if (! Schema::hasColumn('projects', 'description')) {
                $table->text('description')->nullable();
            }
        });

        Schema::table('suppliers', function (Blueprint $table) {
            if (! Schema::hasColumn('suppliers', 'name')) {
                $table->string('name')->nullable();
            }

            if (! Schema::hasColumn('suppliers', 'phone')) {
                $table->string('phone')->nullable();
            }

            if (! Schema::hasColumn('suppliers', 'email')) {
                $table->string('email')->nullable();
            }

            if (! Schema::hasColumn('suppliers', 'category')) {
                $table->string('category')->nullable();
            }

            if (! Schema::hasColumn('suppliers', 'location')) {
                $table->string('location')->nullable();
            }

            if (! Schema::hasColumn('suppliers', 'total_orders')) {
                $table->unsignedInteger('total_orders')->default(0);
            }

            if (! Schema::hasColumn('suppliers', 'paid_amount')) {
                $table->decimal('paid_amount', 12, 2)->default(0);
            }

            if (! Schema::hasColumn('suppliers', 'balance')) {
                $table->decimal('balance', 12, 2)->default(0);
            }

            if (! Schema::hasColumn('suppliers', 'status')) {
                $table->string('status')->default('active');
            }

            if (! Schema::hasColumn('suppliers', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        Schema::table('expenses', function (Blueprint $table) {
            if (! Schema::hasColumn('expenses', 'project_id')) {
                $table->unsignedBigInteger('project_id')->nullable();
            }

            if (! Schema::hasColumn('expenses', 'supplier_id')) {
                $table->unsignedBigInteger('supplier_id')->nullable();
            }

            if (! Schema::hasColumn('expenses', 'title')) {
                $table->string('title')->nullable();
            }

            if (! Schema::hasColumn('expenses', 'category')) {
                $table->string('category')->nullable();
            }

            if (! Schema::hasColumn('expenses', 'quantity')) {
                $table->decimal('quantity', 10, 2)->default(1);
            }

            if (! Schema::hasColumn('expenses', 'unit_price')) {
                $table->decimal('unit_price', 12, 2)->default(0);
            }

            if (! Schema::hasColumn('expenses', 'amount')) {
                $table->decimal('amount', 12, 2)->default(0);
            }

            if (! Schema::hasColumn('expenses', 'expense_date')) {
                $table->date('expense_date')->nullable();
            }

            if (! Schema::hasColumn('expenses', 'payment_method')) {
                $table->string('payment_method')->nullable();
            }

            if (! Schema::hasColumn('expenses', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'project_id')) {
                $table->unsignedBigInteger('project_id')->nullable();
            }

            if (! Schema::hasColumn('payments', 'client_id')) {
                $table->unsignedBigInteger('client_id')->nullable();
            }

            if (! Schema::hasColumn('payments', 'supplier_id')) {
                $table->unsignedBigInteger('supplier_id')->nullable();
            }

            if (! Schema::hasColumn('payments', 'type')) {
                $table->string('type')->nullable();
            }

            if (! Schema::hasColumn('payments', 'amount')) {
                $table->decimal('amount', 12, 2)->default(0);
            }

            if (! Schema::hasColumn('payments', 'payment_date')) {
                $table->date('payment_date')->nullable();
            }

            if (! Schema::hasColumn('payments', 'method')) {
                $table->string('method')->nullable();
            }

            if (! Schema::hasColumn('payments', 'status')) {
                $table->string('status')->default('pending');
            }

            if (! Schema::hasColumn('payments', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        Schema::table('notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('notifications', 'title')) {
                $table->string('title')->nullable();
            }

            if (! Schema::hasColumn('notifications', 'message')) {
                $table->text('message')->nullable();
            }

            if (! Schema::hasColumn('notifications', 'type')) {
                $table->string('type')->default('info');
            }

            if (! Schema::hasColumn('notifications', 'is_read')) {
                $table->boolean('is_read')->default(false);
            }
        });

        Schema::table('messages', function (Blueprint $table) {
            if (! Schema::hasColumn('messages', 'client_id')) {
                $table->unsignedBigInteger('client_id')->nullable();
            }

            if (! Schema::hasColumn('messages', 'project_id')) {
                $table->unsignedBigInteger('project_id')->nullable();
            }

            if (! Schema::hasColumn('messages', 'sender_type')) {
                $table->string('sender_type')->default('client');
            }

            if (! Schema::hasColumn('messages', 'message')) {
                $table->text('message')->nullable();
            }

            if (! Schema::hasColumn('messages', 'is_read')) {
                $table->boolean('is_read')->default(false);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
