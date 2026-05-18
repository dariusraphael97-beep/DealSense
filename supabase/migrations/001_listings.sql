-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

-- Listings table
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  price numeric(10,2) not null check (price > 0),
  category text not null default 'vehicle',
  status text not null default 'active' check (status in ('active', 'pending', 'sold', 'removed')),
  photos text[] not null default '{}',
  location_city text,
  location_state text,
  location_zip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vehicle details table (linked to listings)
create table if not exists listing_vehicles (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade not null unique,
  vin text,
  year int,
  make text,
  model text,
  trim text,
  mileage int,
  color text,
  body_class text,
  drive_type text,
  fuel_type text,
  engine_cylinders text,
  displacement text
);

-- Auto-update updated_at on listings
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listings_updated_at
  before update on listings
  for each row execute function update_updated_at();

-- Row Level Security
alter table listings enable row level security;
alter table listing_vehicles enable row level security;

-- Listings policies
create policy "Anyone can view active listings"
  on listings for select
  using (status = 'active');

create policy "Authenticated users can create listings"
  on listings for insert
  to authenticated
  with check (auth.uid() = seller_id);

create policy "Sellers can update their own listings"
  on listings for update
  to authenticated
  using (auth.uid() = seller_id);

create policy "Sellers can delete their own listings"
  on listings for delete
  to authenticated
  using (auth.uid() = seller_id);

-- Listing vehicles policies
create policy "Anyone can view vehicle details"
  on listing_vehicles for select
  using (true);

create policy "Sellers can insert vehicle details"
  on listing_vehicles for insert
  to authenticated
  with check (
    auth.uid() = (
      select seller_id from listings where id = listing_id
    )
  );

create policy "Sellers can update vehicle details"
  on listing_vehicles for update
  to authenticated
  using (
    auth.uid() = (
      select seller_id from listings where id = listing_id
    )
  );

-- Indexes for performance
create index listings_seller_id_idx on listings(seller_id);
create index listings_status_idx on listings(status);
create index listings_category_idx on listings(category);
create index listings_created_at_idx on listings(created_at desc);
