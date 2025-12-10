# Minimal E-commerce (WhatsApp Checkout)

A minimalist, mobile-first e-commerce with WhatsApp checkout, JSON-backed API, and admin endpoints.

## Tech Stack
- Frontend: React (Vite), hash-based routing for simplicity
- Backend: Express + Helmet + CORS + JSON file store
- Data: JSON files (products, discounts, orders). Swap to MongoDB later if desired.

## Run Locally

1. Install dependencies

```powershell
cd c:\officialweb\server; npm install
cd c:\officialweb\client; npm install
```

2. Start API & Frontend (two terminals)

```powershell
cd c:\officialweb\server; npm run dev
cd c:\officialweb\client; npm run dev
```

- API: http://localhost:4000
- Frontend: http://localhost:5173

3. Admin Login (default)
- POST `/api/auth/login` with `{ "username":"admin", "password":"admin123" }` to get Bearer token.
- Use token for protected CRUD on products/discounts.

## WhatsApp Checkout
- Button builds `https://wa.me/<phone>?text=<encoded>` including product name, variant, qty, and PDP link.

## SEO
- Clean product slugs (e.g., `/products/minimalist-wallet`).
- Add custom titles/descriptions via product `seo` field.

## Notes
- Replace `BUSINESS_PHONE` in `client/src/App.jsx`.
- Images: Place assets under `client/public/images` or serve externally.
- For GA4/Pixel, add scripts in `index.html` where needed.
