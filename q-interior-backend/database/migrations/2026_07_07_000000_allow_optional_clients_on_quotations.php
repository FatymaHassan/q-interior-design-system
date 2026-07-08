<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->makeClientNullable('quotations', true);
        $this->makeClientNullable('quotation_approvals', true);
    }

    public function down(): void
    {
        $this->makeClientNullable('quotation_approvals', false);
        $this->makeClientNullable('quotations', false);
    }

    private function makeClientNullable(string $tableName, bool $nullable): void
    {
        if (! Schema::hasTable($tableName) || ! Schema::hasColumn($tableName, 'client_id')) {
            return;
        }

        $this->dropClientForeign($tableName);
        $this->changeClientColumn($tableName, $nullable);
        $this->addClientForeign($tableName, $nullable);
    }

    private function dropClientForeign(string $tableName): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['client_id']);
            });
        } catch (Throwable) {
            // The live database may already have this foreign key removed from a partial deploy.
        }
    }

    private function changeClientColumn(string $tableName, bool $nullable): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($nullable) {
                $table->unsignedBigInteger('client_id')->nullable($nullable)->change();
            });
        } catch (Throwable $exception) {
            if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
                throw $exception;
            }

            $nullSql = $nullable ? 'NULL' : 'NOT NULL';
            DB::statement("ALTER TABLE `{$tableName}` MODIFY `client_id` BIGINT UNSIGNED {$nullSql}");
        }
    }

    private function addClientForeign(string $tableName, bool $nullable): void
    {
        try {
            Schema::table($tableName, function (Blueprint $table) use ($nullable) {
                $foreign = $table->foreign('client_id')->references('id')->on('clients');
                $nullable ? $foreign->nullOnDelete() : $foreign->cascadeOnDelete();
            });
        } catch (Throwable) {
            // If the foreign key already exists, keep going so deploy startup remains healthy.
        }
    }
};
