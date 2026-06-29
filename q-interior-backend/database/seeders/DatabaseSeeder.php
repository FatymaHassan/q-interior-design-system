<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed production-safe baseline records only.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            DefaultAdminUserSeeder::class,
            SettingsSeeder::class,
            ExpenseCategoriesSeeder::class,
            ProjectStagesSeeder::class,
            DepartmentsSeeder::class,
        ]);
    }
}
