<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->enum('type', ['project_expense', 'overhead', 'payroll', 'other'])->default('project_expense');
            $table->timestamps();
        });

        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('position')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->decimal('monthly_salary', 12, 2)->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->default(0);
            $table->date('payment_date')->nullable();
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('file_path');
            $table->string('file_type')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('admin')->after('password');
            }
        });

        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'address')) {
                $table->string('address')->nullable()->after('email');
            }
        });

        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'name')) {
                $table->string('name')->nullable()->after('client_id');
            }
            if (! Schema::hasColumn('projects', 'revenue')) {
                $table->decimal('revenue', 12, 2)->default(0)->after('budget');
            }
            if (! Schema::hasColumn('projects', 'notes')) {
                $table->text('notes')->nullable()->after('description');
            }
            if (! Schema::hasColumn('projects', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('expenses', function (Blueprint $table) {
            if (! Schema::hasColumn('expenses', 'category_id')) {
                $table->foreignId('category_id')->nullable()->after('supplier_id')->constrained('expense_categories')->nullOnDelete();
            }
            if (! Schema::hasColumn('expenses', 'item_name')) {
                $table->string('item_name')->nullable()->after('category');
            }
            if (! Schema::hasColumn('expenses', 'description')) {
                $table->text('description')->nullable()->after('item_name');
            }
            if (! Schema::hasColumn('expenses', 'paid_by')) {
                $table->string('paid_by')->nullable()->after('amount');
            }
            if (! Schema::hasColumn('expenses', 'receipt_file')) {
                $table->string('receipt_file')->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('expenses', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('overheads', function (Blueprint $table) {
            if (! Schema::hasColumn('overheads', 'category_id')) {
                $table->foreignId('category_id')->nullable()->after('id')->constrained('expense_categories')->nullOnDelete();
            }
            if (! Schema::hasColumn('overheads', 'description')) {
                $table->text('description')->nullable()->after('category');
            }
            if (! Schema::hasColumn('overheads', 'paid_by')) {
                $table->string('paid_by')->nullable()->after('amount');
            }
            if (! Schema::hasColumn('overheads', 'receipt_file')) {
                $table->string('receipt_file')->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('overheads', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('payrolls', function (Blueprint $table) {
            if (! Schema::hasColumn('payrolls', 'employee_id')) {
                $table->foreignId('employee_id')->nullable()->after('id')->constrained('employees')->nullOnDelete();
            }
            if (! Schema::hasColumn('payrolls', 'month')) {
                $table->unsignedTinyInteger('month')->nullable()->after('role');
            }
            if (! Schema::hasColumn('payrolls', 'year')) {
                $table->unsignedSmallInteger('year')->nullable()->after('month');
            }
            if (! Schema::hasColumn('payrolls', 'salary_amount')) {
                $table->decimal('salary_amount', 12, 2)->nullable()->after('year');
            }
            if (! Schema::hasColumn('payrolls', 'payment_status')) {
                $table->string('payment_status')->nullable()->after('salary_amount');
            }
            if (! Schema::hasColumn('payrolls', 'payment_date')) {
                $table->date('payment_date')->nullable()->after('payment_status');
            }
            if (! Schema::hasColumn('payrolls', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('payment_date');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('payment_date');
            }
            if (! Schema::hasColumn('payments', 'reference_number')) {
                $table->string('reference_number')->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('payments', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('suppliers', function (Blueprint $table) {
            if (! Schema::hasColumn('suppliers', 'address')) {
                $table->string('address')->nullable()->after('email');
            }
        });

        Schema::table('notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('notifications', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('expense_categories');
    }
};
