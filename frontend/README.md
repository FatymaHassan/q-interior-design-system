# Frontend

React + Vite + Tailwind starter for Q Interior Design.

## Run

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the Laravel API at `http://127.0.0.1:8000`. Start it from the backend folder:

```bash
cd ../q-interior-backend
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

## Main pages

- Dashboard
- Projects
- Clients
- Suppliers
- Purchase Orders
- Expenses
- Payments
- Inventory
- AI Agent
- Messages
- Notifications
- Reports
- Customer Portal
