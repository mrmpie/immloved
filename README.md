# 🏠 Immloved — ImmobilienScout24 Apartment Favorites Manager

A modern web app for managing your favorite apartments from ImmobilienScout24. Track visits, add comments per user, view on a map, translate listings to English, and more.

## Features

- **Favorites Management** — Save apartments with full details from ImmobilienScout24
- **Split View (Desktop)** — Apartment list on the left, interactive map on the right
- **Mobile Responsive** — Tabbed view switching between list and map
- **Two-User System** — User 1 (💖) and User 2 (💙) can independently mark favorites, add comments, and track visits
- **Visit Tracking** — Mark apartments as visited with specific dates
- **5-Star Preference Rating** — Rate each apartment on a 1–5 scale
- **Custom Ranking** — Drag/reorder your favorites list
- **Advanced Filtering** — Filter by rooms, price range, area, user, visit status
- **Sorting** — Sort by price, price/m², area, rooms, preference, custom rank
- **Map Pins** — Each pin shows the apartment's final price; pins are color-coded by user
- **Editable Addresses** — Double-click to edit; auto-geocodes to update map
- **Quick Add** — Paste any ImmobilienScout24 URL to add to favorites
- **Search View** — Open ImmobilienScout24 search with custom filters
- **Translation** — Translate German descriptions to English (via MyMemory API)
- **Removed List** — Soft-delete apartments; restore anytime
- **Excel Import** — Import from "Apartamentos Leipzig.xlsx" or similar Excel files
- **Supabase Backend** — Persistent cloud storage (with localStorage fallback)

## Getting Started

### 1. Install dependencies

```bash
cd immloved
npm install
```

### 2. Configure Supabase (optional)

Copy the example env file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project URL and anon key. If not configured, the app uses **localStorage** as a fallback (great for development).

To set up the Supabase database, run the SQL in `supabase/schema.sql` in your Supabase SQL editor.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Import your Excel data

Navigate to the **Import** tab and upload your `Apartamentos Leipzig.xlsx` file.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** for styling
- **Leaflet** for interactive maps
- **Supabase** for database (with localStorage fallback)
- **Zustand** for state management
- **SheetJS (xlsx)** for Excel import
- **Lucide React** for icons

## Project Structure

```
immloved/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Favorites view (split list + map)
│   │   ├── search/page.tsx   # Search ImmobilienScout24
│   │   ├── removed/page.tsx  # Removed apartments
│   │   └── import/page.tsx   # Excel import
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── FilterBar.tsx
│   │   ├── ApartmentCard.tsx
│   │   ├── ApartmentList.tsx
│   │   ├── ApartmentMap.tsx
│   │   └── AddApartmentDialog.tsx
│   └── lib/
│       ├── types.ts          # TypeScript types
│       ├── store.ts          # Zustand store
│       ├── supabase.ts       # Supabase client
│       ├── excel-import.ts   # Excel parser
│       ├── geocode.ts        # Address geocoding
│       └── utils.ts          # Utility functions
└── supabase/
    └── schema.sql            # Database schema
```

## GitHub Repository Setup

```bash
cd immloved
git init
git add .
git commit -m "Initial commit: Immloved apartment favorites manager"
git remote add origin https://github.com/YOUR_USERNAME/immloved.git
git push -u origin main
```
