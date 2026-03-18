-- Immloved: ImmobilienScout24 Apartment Favorites Manager
-- Run this in your Supabase SQL editor to create the schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Main apartments table
create table if not exists apartments (
  id uuid primary key default uuid_generate_v4(),
  immoscout_id text unique,
  url text,
  title text,
  title_en text,
  address text,
  latitude double precision,
  longitude double precision,
  price numeric,
  area numeric,
  price_per_m2 numeric generated always as (
    case when area > 0 then round(price / area, 2) else null end
  ) stored,
  rooms numeric,
  bedrooms integer,
  bathrooms integer,
  floor text,
  available_from text,
  type text,
  year_built text,
  condition text,
  condition_en text,
  heating text,
  energy_sources text,
  energy_consumption text,
  energy_cert text,
  parking text,
  elevator text,
  listed_building text,
  renovation text,
  rented text,
  rental_income text,
  deposit text,
  district text,
  description text,
  description_en text,
  equipment text,
  equipment_en text,
  location_description text,
  location_description_en text,
  contact_name text,
  contact_company text,
  contact_phone text,
  contact_email text,
  company_website text,
  thumbnail_url text,
  other_urls text,
  -- Favorite status
  is_favorite boolean not null default true,
  is_removed boolean not null default false,
  -- User marks
  user1_favorite boolean not null default false,
  user2_favorite boolean not null default false,
  user1_comment text,
  user2_comment text,
  user1_visited boolean not null default false,
  user1_visit_date date,
  user2_visited boolean not null default false,
  user2_visit_date date,
  -- Rating & ranking
  preference_rating integer check (preference_rating between 1 and 5),
  rank_order integer,
  -- Visitados fields
  would_buy text,
  pros text,
  cons text,
  zone_rating text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for common queries
create index if not exists idx_apartments_favorite on apartments(is_favorite, is_removed);
create index if not exists idx_apartments_rooms on apartments(rooms);
create index if not exists idx_apartments_price on apartments(price);
create index if not exists idx_apartments_immoscout on apartments(immoscout_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger apartments_updated_at
  before update on apartments
  for each row
  execute function update_updated_at();

-- Row Level Security (open for now, restrict as needed)
alter table apartments enable row level security;

create policy "Allow all access" on apartments
  for all
  using (true)
  with check (true);
