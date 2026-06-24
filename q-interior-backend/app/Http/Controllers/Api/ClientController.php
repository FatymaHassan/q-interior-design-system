<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ClientController extends Controller
{
    public function index()
    {
        return Client::with('projects')->latest()->get()->each->append('has_portal_access');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'portal_password' => 'nullable|string|min:6',
        ]);

        if (! empty($data['portal_password'])) {
            $data['portal_password'] = Hash::make($data['portal_password']);
        } else {
            unset($data['portal_password']);
        }

        return Client::create($data)->append('has_portal_access');
    }

    public function show(Client $client)
    {
        return $client->load('projects')->append('has_portal_access');
    }

    public function update(Request $request, Client $client)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'portal_password' => 'nullable|string|min:6',
        ]);

        if (! empty($data['portal_password'])) {
            $data['portal_password'] = Hash::make($data['portal_password']);
            $data['portal_token_hash'] = null;
            $data['portal_token_expires_at'] = null;
        } else {
            unset($data['portal_password']);
        }

        $client->update($data);

        return $client->append('has_portal_access');
    }

    public function destroy(Client $client)
    {
        $client->delete();

        return response()->json(['message' => 'Client deleted successfully']);
    }
}
