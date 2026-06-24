# Q Interior Design Management System

A complete starter project for an interior design company management system.

It includes:

- React + Vite frontend
- Laravel-style backend API structure
- SQLite-ready Laravel database migrations
- Supplier management
- Project management
- Procurement / purchase orders
- Expenses and payments
- Customer portal
- Notifications and messages
- AI Agent module
- Reports and finance dashboard

This project has a React/Vite frontend and a Laravel backend API that are connected through `/api`.

## Project Structure

```txt
q-interior-design-system/
  frontend/   React + Vite + Tailwind dashboard
  q-interior-backend/    Laravel API files, migrations, models, controllers
```

## Run Locally

Open two terminals.

Backend:

```bash
cd q-interior-backend
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Then open:

```txt
http://localhost:5173
```

## Main Theme

- Dark espresso brown: `#4A3427`
- Soft gold: `#C8A46A`
- Warm cream: `#F8F5EF`
- White cards: `#FFFFFF`
- Beige soft: `#F1E8DA`

The frontend uses `VITE_API_URL=/api` and Vite proxies `/api` requests to Laravel on `http://127.0.0.1:8000`.
