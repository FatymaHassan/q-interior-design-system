<?php

$db = new PDO('sqlite:C:\q-interior-design-system\q-interior-backend\database\database.sqlite');
$hash = password_hash('password', PASSWORD_BCRYPT);
$exists = $db->prepare('select id from users where email = ?');
$exists->execute(['test@example.com']);
if ($exists->fetchColumn()) {
    $stmt = $db->prepare('update users set name = ?, password = ?, role = ? where email = ?');
    $stmt->execute(['Test User', $hash, 'admin', 'test@example.com']);
} else {
    $stmt = $db->prepare('insert into users (name, email, password, role, created_at, updated_at) values (?, ?, ?, ?, datetime("now"), datetime("now"))');
    $stmt->execute(['Test User', 'test@example.com', $hash, 'admin']);
}
$db->exec('delete from personal_access_tokens');
echo "admin credential reset\n";
