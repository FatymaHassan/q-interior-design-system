<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = collect($this->permissions())
            ->mapWithKeys(function (string $label, string $name) {
                $permission = Permission::firstOrCreate(
                    ['name' => $name],
                    ['label' => $label]
                );

                return [$name => $permission];
            });

        foreach ($this->roles() as $name => $roleConfig) {
            $role = Role::firstOrCreate(
                ['name' => $name],
                ['label' => $roleConfig['label']]
            );

            $permissionIds = $roleConfig['permissions'] === ['*']
                ? $permissions->pluck('id')->all()
                : $permissions->only($roleConfig['permissions'])->pluck('id')->all();

            $role->permissions()->syncWithoutDetaching($permissionIds);
        }
    }

    private function permissions(): array
    {
        return [
            'view_dashboard' => 'View dashboard',
            'manage_users' => 'Manage users',
            'manage_roles' => 'Manage roles and permissions',
            'manage_clients' => 'Manage clients',
            'manage_projects' => 'Manage projects',
            'manage_documents' => 'Manage documents',
            'manage_notifications' => 'Manage notifications',
            'manage_quotations' => 'Manage quotations',
            'manage_finance' => 'Manage finance module',
            'manage_hr' => 'Manage HR module',
            'manage_inventory' => 'Manage inventory and suppliers',
            'manage_reports' => 'Manage reports',
            'manage_settings' => 'Manage company settings',
        ];
    }

    private function roles(): array
    {
        return [
            'admin' => [
                'label' => 'Administrator',
                'permissions' => ['*'],
            ],
            'manager' => [
                'label' => 'Project Manager',
                'permissions' => [
                    'view_dashboard',
                    'manage_clients',
                    'manage_projects',
                    'manage_documents',
                    'manage_notifications',
                    'manage_quotations',
                    'manage_inventory',
                    'manage_reports',
                ],
            ],
            'designer' => [
                'label' => 'Designer',
                'permissions' => [
                    'view_dashboard',
                    'manage_projects',
                    'manage_documents',
                    'manage_notifications',
                    'manage_quotations',
                ],
            ],
            'hr' => [
                'label' => 'HR Staff',
                'permissions' => [
                    'view_dashboard',
                    'manage_hr',
                    'manage_notifications',
                    'manage_reports',
                ],
            ],
            'finance' => [
                'label' => 'Finance Staff',
                'permissions' => [
                    'view_dashboard',
                    'manage_finance',
                    'manage_notifications',
                    'manage_inventory',
                    'manage_reports',
                ],
            ],
            'staff' => [
                'label' => 'Project Staff',
                'permissions' => [
                    'view_dashboard',
                    'manage_projects',
                    'manage_notifications',
                    'manage_inventory',
                ],
            ],
            'viewer' => [
                'label' => 'Viewer',
                'permissions' => [
                    'view_dashboard',
                ],
            ],
        ];
    }
}
