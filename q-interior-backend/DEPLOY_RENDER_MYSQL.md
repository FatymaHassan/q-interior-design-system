
# Deploy Laravel Backend to Render with Aiven MySQL

Use these settings when creating the Render Web Service:

- Language: Docker
- Root Directory: `q-interior-backend`
- Dockerfile Path: `./Dockerfile`
- Branch: `main`

## Aiven MySQL Values

Create or open your Aiven MySQL service and copy these values into Render environment variables:

- Host
- Port
- Database
- Username
- Password

If Aiven provides a CA certificate and requires SSL, upload or provide the CA path in Render and set `MYSQL_ATTR_SSL_CA`.

## Render Environment Variables

Set these in Render. Do not commit `.env` files or real passwords.

```env
APP_NAME=Q Interior
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-render-backend.onrender.com
APP_KEY=PASTE_GENERATED_APP_KEY_HERE

DB_CONNECTION=mysql
DB_HOST=your-aiven-host
DB_PORT=3306
DB_DATABASE=your-aiven-database
DB_USERNAME=your-aiven-username
DB_PASSWORD=PASTE_DATABASE_PASSWORD_HERE

FILESYSTEM_DISK=public
FRONTEND_URL=https://your-frontend.vercel.app
```

Optional MySQL SSL variables:

```env
MYSQL_ATTR_SSL_CA=/path/to/ca.pem
MYSQL_SSL_VERIFY_SERVER_CERT=true
```

Keep `MYSQL_ATTR_SSL_CA` empty if your local MySQL does not use SSL.

## Generate APP_KEY

Run this locally inside `q-interior-backend`:

```bash
php artisan key:generate --show
```

Copy the output into Render as `APP_KEY`.

## Notes

- Render will build from `q-interior-backend/Dockerfile`.
- The container runs `php artisan migrate --force` on startup.
- The container runs `php artisan storage:link || true` so file storage links do not fail the deploy if already present.
- Do not commit `.env`, database passwords, or Aiven secrets.
