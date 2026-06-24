@echo off
cd /d C:\q-interior-design-system\q-interior-backend
set DB_CONNECTION=sqlite
set DB_DATABASE=C:\q-interior-design-system\q-interior-backend\database\database.sqlite
php artisan serve --host=127.0.0.1 --port=8000
