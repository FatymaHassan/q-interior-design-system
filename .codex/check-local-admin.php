<?php

chdir(__DIR__ . '/../q-interior-backend');
require __DIR__ . '/../q-interior-backend/vendor/autoload.php';
$app = require __DIR__ . '/../q-interior-backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::where('email', 'test@example.com')->first();
echo 'user=' . ($user?->email ?? 'missing') . PHP_EOL;
echo 'role=' . ($user?->role ?? '-') . PHP_EOL;
echo 'hash=' . substr((string) $user?->password, 0, 7) . PHP_EOL;
echo 'check=' . (Illuminate\Support\Facades\Hash::check('password', (string) $user?->password) ? 'yes' : 'no') . PHP_EOL;
echo 'db=' . config('database.default') . ':' . config('database.connections.sqlite.database') . PHP_EOL;
