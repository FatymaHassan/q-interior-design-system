<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return User::with('roles')->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string|max:255',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $roleIds = $data['role_ids'] ?? [];
        unset($data['role_ids']);
        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);
        $this->syncRoles($user, $roleIds, $data['role'] ?? null);

        return $user->load('roles');
    }

    public function show(User $user)
    {
        return $user->load(['roles.permissions', 'assignedProjects']);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:255',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $roleIds = $data['role_ids'] ?? null;
        unset($data['role_ids']);
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $user->update($data);
        if (is_array($roleIds)) {
            $this->syncRoles($user, $roleIds, $data['role'] ?? null);
        }

        return $user->load('roles');
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    private function syncRoles(User $user, array $roleIds, ?string $roleName): void
    {
        if (! $roleIds && $roleName) {
            $role = Role::firstOrCreate(['name' => $roleName], ['label' => ucfirst($roleName)]);
            $roleIds = [$role->id];
        }

        if ($roleIds) {
            $user->roles()->sync($roleIds);
        }
    }
}
