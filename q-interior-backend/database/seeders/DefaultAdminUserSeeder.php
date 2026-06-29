<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DefaultAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('Q_INTERIOR_ADMIN_EMAIL');
        $password = env('Q_INTERIOR_ADMIN_PASSWORD');
        $name = env('Q_INTERIOR_ADMIN_NAME', 'Q Interior Admin');

        if (! $email || ! $password) {
            $this->command?->warn('Skipped default admin user. Set Q_INTERIOR_ADMIN_EMAIL and Q_INTERIOR_ADMIN_PASSWORD before running db:seed.');

            return;
        }

        $admin = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'role' => 'admin',
            ]
        );

        $adminRole = Role::firstOrCreate(
            ['name' => 'admin'],
            ['label' => 'Administrator']
        );

        $admin->roles()->syncWithoutDetaching([$adminRole->id]);
    }
}
