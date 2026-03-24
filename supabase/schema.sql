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
  floor_en text,
  available_from text,
  available_from_en text,
  type text,
  type_en text,
  year_built text,
  year_built_en text,
  condition text,
  condition_en text,
  heating text,
  heating_en text,
  energy_sources text,
  energy_sources_en text,
  energy_consumption text,
  energy_consumption_en text,
  energy_cert text,
  energy_cert_en text,
  kitchen boolean,
  hausgeld numeric,
  agency_fee text,
  agency_fee_en text,
  parking text,
  parking_en text,
  elevator text,
  elevator_en text,
  listed_building text,
  listed_building_en text,
  renovation text,
  renovation_en text,
  rented text,
  rented_en text,
  deposit text,
  deposit_en text,
  district text,
  district_en text,
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
  would_buy_en text,
  pros text,
  pros_en text,
  cons text,
  cons_en text,
  zone_rating text,
  zone_rating_en text,
  -- Hbf travel information (persistent, calculated once)
  hbf_walk_time integer,
  hbf_walk_dist numeric(4,1),
  hbf_bike_time integer,
  hbf_bike_dist numeric(4,1),
  hbf_transit_time integer,
  hbf_straight_dist numeric(4,1),
  hbf_calculated_at timestamptz,
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

-- User settings table (stores user names, column order, preferences)
create table if not exists user_settings (
  id text primary key default 'default',
  user_name1 text not null default 'Maria',
  user_name2 text not null default 'Rodrigo',
  table_column_order jsonb, -- array of column keys, e.g. ["title","price","area"]
  table_map_position text not null default 'right' check (table_map_position in ('right', 'below')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for updated_at
create trigger user_settings_updated_at
  before update on user_settings
  for each row
  execute function update_updated_at();

-- RLS
alter table user_settings enable row level security;

create policy "Allow all access to user_settings" on user_settings
  for all
  using (true)
  with check (true);

-- Insert default row
insert into user_settings (id) values ('default') on conflict do nothing;
