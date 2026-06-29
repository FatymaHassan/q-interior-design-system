<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->settings() as $setting) {
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }

    private function settings(): array
    {
        return [
            ['key' => 'company_name', 'value' => 'Q Interior Design', 'type' => 'string'],
            ['key' => 'company_email', 'value' => 'info@qinterior.example', 'type' => 'string'],
            ['key' => 'company_phone', 'value' => '+252 61 0000000', 'type' => 'string'],
            ['key' => 'company_address', 'value' => 'Mogadishu, Somalia', 'type' => 'string'],
            ['key' => 'default_currency', 'value' => 'USD', 'type' => 'string'],
            ['key' => 'currency', 'value' => 'USD', 'type' => 'string'],
            ['key' => 'invoice_prefix', 'value' => 'INV-', 'type' => 'string'],
            ['key' => 'quotation_prefix', 'value' => 'QT-', 'type' => 'string'],
            ['key' => 'purchase_order_prefix', 'value' => 'PO-', 'type' => 'string'],
            ['key' => 'default_tax_rate', 'value' => '0', 'type' => 'number'],
            ['key' => 'expense_auto_approve_limit', 'value' => '500', 'type' => 'number'],
            ['key' => 'expense_approval_threshold', 'value' => '500', 'type' => 'number'],
            ['key' => 'hr_start_time', 'value' => '09:00', 'type' => 'string'],
            ['key' => 'working_hours_start', 'value' => '09:00', 'type' => 'string'],
            ['key' => 'working_hours_end', 'value' => '17:00', 'type' => 'string'],
            ['key' => 'backup_enabled', 'value' => 'true', 'type' => 'boolean'],
            ['key' => 'backup_type', 'value' => 'full', 'type' => 'string'],
            ['key' => 'backup_time', 'value' => '23:00', 'type' => 'string'],
            ['key' => 'notifications_enabled', 'value' => 'true', 'type' => 'boolean'],
            ['key' => 'daily_summary_enabled', 'value' => 'true', 'type' => 'boolean'],
        ];
    }
}
