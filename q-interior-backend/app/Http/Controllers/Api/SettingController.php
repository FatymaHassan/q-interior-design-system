<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        return Setting::orderBy('key')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'key' => 'required|string|max:255',
            'value' => 'nullable|string',
            'type' => 'nullable|string|max:255',
        ]);

        return Setting::updateOrCreate(['key' => $data['key']], $data);
    }

    public function show(Setting $setting)
    {
        return $setting;
    }

    public function update(Request $request, Setting $setting)
    {
        $data = $request->validate([
            'key' => 'sometimes|required|string|max:255',
            'value' => 'nullable|string',
            'type' => 'nullable|string|max:255',
        ]);

        $setting->update($data);

        return $setting;
    }

    public function destroy(Setting $setting)
    {
        $setting->delete();

        return response()->json(['message' => 'Setting deleted successfully']);
    }
}
