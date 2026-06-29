<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentsSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->departments() as $department) {
            Department::firstOrCreate(
                ['name' => $department['name']],
                $department + ['status' => 'Active']
            );
        }
    }

    private function departments(): array
    {
        return [
            ['name' => 'Design', 'description' => 'Interior design and concept team'],
            ['name' => 'Operations', 'description' => 'Operations and project coordination'],
            ['name' => 'Finance', 'description' => 'Payments, payroll, and reporting'],
            ['name' => 'HR', 'description' => 'People operations'],
            ['name' => 'Site Team', 'description' => 'Site installation and supervision'],
            ['name' => 'Sales', 'description' => 'Client acquisition and follow-up'],
            ['name' => 'Management', 'description' => 'Leadership team'],
        ];
    }
}
