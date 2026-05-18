# Phase 1: Core Marketplace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working marketplace where sellers can create vehicle listings with photos and VIN auto-fill, and buyers can browse and view listings.

**Architecture:** New Supabase tables (listings, listing_vehicles) with RLS policies. New API routes for listing CRUD. New pages for browse, single listing, and create listing. Photo uploads go to Supabase Storage. VIN decode reuses the existing `/api/vin` route.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + Storage), TypeScript, Tailwind CSS, existing `/api/vin` route for NHTSA decode.

**⚠️ Important:** The existing `src/app/page.tsx` and all existing pages (analyze, saved, results, etc.) are NOT touched in this phase. The new marketplace is built as new routes alongside the existing app.

---

## File Map

**New files:**
- `supabase/migrations/001_listings.sql` — listings + listing_vehicles tables with RLS
- `src/types/listing.ts` — shared TypeScript types for listings
- `src/lib/listings.ts` — Supabase helper functions for listing queries
- `src/app/marketplace/page.tsx` — browse all listings
- `src/app/marketplace/new/page.tsx` — create listing page
- `src/app/marketplace/[id]/page.tsx` — single listing detail page
- `src/app/api/listings/route.ts` — GET (browse) + POST (create) listings
- `src/app/api/listings/[id]/route.ts` — GET single listing
- `src/components/marketplace/ListingCard.tsx` — listing card for browse grid
- `src/components/marketplace/ListingForm.tsx` — create listing form with VIN lookup
- `src/components/marketplace/PhotoUpload.tsx` — drag/drop photo uploader

**Not touched:**
- `src/app/page.tsx` (homepage)
- `src/app/analyze/` (deal analyzer)
- `src/app/saved/` (saved cars)
- `src/app/results/` (results)
- Any existing components

---

## Task 1: Database Schema

**Files:**
- Create: `supabase/migrations/001_listings.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/001_listings.sql` with this exact content:

```sql
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
```

- [ ] **Step 2: Run the migration in Supabase dashboard**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Paste the entire SQL from the file above
4. Click **Run**
5. Expected: "Success. No rows returned"

- [ ] **Step 3: Create Supabase Storage bucket**

In the Supabase dashboard:
1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `listing-photos`
4. Toggle **Public bucket** ON
5. Click **Create bucket**
6. Click on the bucket → **Policies** → **New policy** → **For full customization**
7. Add this policy:
   - Policy name: `Authenticated users can upload`
   - Allowed operation: INSERT
   - Target roles: authenticated
   - Policy definition: `bucket_id = 'listing-photos'`
8. Add another policy:
   - Policy name: `Anyone can view photos`
   - Allowed operation: SELECT
   - Target roles: (leave empty for public)
   - Policy definition: `bucket_id = 'listing-photos'`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_listings.sql
git commit -m "feat: add listings and listing_vehicles tables with RLS"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/listing.ts`

- [ ] **Step 1: Create the types file**

Create `src/types/listing.ts`:

```typescript
export type ListingStatus = 'active' | 'pending' | 'sold' | 'removed';
export type ListingCategory = 'vehicle' | 'watch' | 'jewelry' | 'electronics' | 'other';

export interface ListingVehicle {
  id: string;
  listing_id: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number | null;
  color: string | null;
  body_class: string | null;
  drive_type: string | null;
  fuel_type: string | null;
  engine_cylinders: string | null;
  displacement: string | null;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: ListingCategory;
  status: ListingStatus;
  photos: string[];
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  created_at: string;
  updated_at: string;
  listing_vehicles?: ListingVehicle | null;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  category: ListingCategory;
  photos: string[];
  location_city: string;
  location_state: string;
  location_zip: string;
  vehicle?: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim: string;
    mileage: number;
    color: string;
    body_class: string;
    drive_type: string;
    fuel_type: string;
    engine_cylinders: string;
    displacement: string;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/listing.ts
git commit -m "feat: add Listing TypeScript types"
```

---

## Task 3: Supabase Helper Functions

**Files:**
- Create: `src/lib/listings.ts`

- [ ] **Step 1: Create the listings helper**

Create `src/lib/listings.ts`:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { Listing, CreateListingInput } from '@/types/listing';

export async function getListings(): Promise<Listing[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_vehicles (*)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getListing(id: string): Promise<Listing | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_vehicles (*)
    `)
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (error) return null;
  return data;
}

export async function getPhotoUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from('listing-photos')
    .getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/listings.ts
git commit -m "feat: add listings Supabase helper functions"
```

---

## Task 4: Listing API Routes

**Files:**
- Create: `src/app/api/listings/route.ts`
- Create: `src/app/api/listings/[id]/route.ts`

- [ ] **Step 1: Create the listings collection route**

Create `src/app/api/listings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CreateListingInput } from '@/types/listing';

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// GET /api/listings — browse all active listings
export async function GET() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_vehicles(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/listings — create a new listing
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body: CreateListingInput = await req.json();

  if (!body.title || !body.price || !body.category) {
    return NextResponse.json(
      { error: 'title, price, and category are required' },
      { status: 400 }
    );
  }

  // Insert listing
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      title: body.title,
      description: body.description,
      price: body.price,
      category: body.category,
      photos: body.photos ?? [],
      location_city: body.location_city,
      location_state: body.location_state,
      location_zip: body.location_zip,
    })
    .select()
    .single();

  if (listingError) {
    return NextResponse.json({ error: listingError.message }, { status: 500 });
  }

  // Insert vehicle details if provided
  if (body.vehicle && body.category === 'vehicle') {
    const { error: vehicleError } = await supabase
      .from('listing_vehicles')
      .insert({
        listing_id: listing.id,
        vin: body.vehicle.vin,
        year: body.vehicle.year,
        make: body.vehicle.make,
        model: body.vehicle.model,
        trim: body.vehicle.trim,
        mileage: body.vehicle.mileage,
        color: body.vehicle.color,
        body_class: body.vehicle.body_class,
        drive_type: body.vehicle.drive_type,
        fuel_type: body.vehicle.fuel_type,
        engine_cylinders: body.vehicle.engine_cylinders,
        displacement: body.vehicle.displacement,
      });

    if (vehicleError) {
      // Clean up the listing if vehicle insert fails
      await supabase.from('listings').delete().eq('id', listing.id);
      return NextResponse.json({ error: vehicleError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: listing.id }, { status: 201 });
}
```

- [ ] **Step 2: Create the single listing route**

Create `src/app/api/listings/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_vehicles(*)')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 3: Test the GET route**

Start your dev server:
```bash
npm run dev
```

Visit in browser: `http://localhost:3000/api/listings`

Expected: `[]` (empty array — no listings yet)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/listings/
git commit -m "feat: add GET and POST /api/listings routes"
```

---

## Task 5: PhotoUpload Component

**Files:**
- Create: `src/components/marketplace/PhotoUpload.tsx`

- [ ] **Step 1: Create the photo upload component**

Create `src/components/marketplace/PhotoUpload.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ photos, onChange, maxPhotos = 10 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFiles(files: FileList) {
    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);
    setError(null);
    const newPaths: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        setUploading(false);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Each photo must be under 10MB');
        setUploading(false);
        return;
      }

      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(path, file);

      if (uploadError) {
        setError('Upload failed — please try again');
        setUploading(false);
        return;
      }

      newPaths.push(path);
    }

    onChange([...photos, ...newPaths]);
    setUploading(false);
  }

  function removePhoto(path: string) {
    onChange(photos.filter(p => p !== path));
  }

  function getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(path);
    return data.publicUrl;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map(path => (
          <div key={path} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
            <img
              src={getPublicUrl(path)}
              alt="Listing photo"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(path)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/40 hover:border-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-2xl">+</span>
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <p className="text-white/30 text-xs">
        {photos.length}/{maxPhotos} photos · JPG, PNG, WebP · Max 10MB each
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marketplace/PhotoUpload.tsx
git commit -m "feat: add PhotoUpload component with Supabase Storage"
```

---

## Task 6: ListingForm Component

**Files:**
- Create: `src/components/marketplace/ListingForm.tsx`

- [ ] **Step 1: Create the listing form**

Create `src/components/marketplace/ListingForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoUpload } from './PhotoUpload';
import type { CreateListingInput } from '@/types/listing';

export function ListingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [vinData, setVinData] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'vehicle' as const,
    location_city: '',
    location_state: '',
    location_zip: '',
    vin: '',
    mileage: '',
    color: '',
  });

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function lookupVin() {
    if (form.vin.length < 11) return;
    setVinLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/vin?vin=${form.vin}`);
      const data = await res.json();
      if (data.make) {
        setVinData(data);
        update('title', `${data.year} ${data.make} ${data.model}${data.trim ? ' ' + data.trim : ''}`);
      } else {
        setError('VIN not found — please check and try again');
      }
    } catch {
      setError('VIN lookup failed — please try again');
    } finally {
      setVinLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (photos.length === 0) {
      setError('Please add at least one photo');
      setLoading(false);
      return;
    }

    const body: CreateListingInput = {
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      photos,
      location_city: form.location_city,
      location_state: form.location_state,
      location_zip: form.location_zip,
      ...(form.category === 'vehicle' && vinData && {
        vehicle: {
          vin: form.vin,
          year: vinData.year,
          make: vinData.make,
          model: vinData.model,
          trim: vinData.trim ?? '',
          mileage: parseInt(form.mileage) || 0,
          color: form.color,
          body_class: vinData.bodyClass ?? '',
          drive_type: vinData.driveType ?? '',
          fuel_type: vinData.fuelType ?? '',
          engine_cylinders: vinData.engineCylinders ?? '',
          displacement: vinData.displacement ?? '',
        },
      }),
    };

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to create listing');
        return;
      }

      router.push(`/marketplace/${data.id}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          Category
        </label>
        <select
          value={form.category}
          onChange={e => update('category', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="vehicle">Vehicle (car, motorcycle, boat, RV)</option>
          <option value="watch">Watch</option>
          <option value="jewelry">Jewelry</option>
          <option value="electronics">Electronics</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* VIN lookup — vehicles only */}
      {form.category === 'vehicle' && (
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            VIN (auto-fills vehicle details)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.vin}
              onChange={e => update('vin', e.target.value.toUpperCase())}
              placeholder="e.g. 1HGBH41JXMN109186"
              maxLength={17}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={lookupVin}
              disabled={form.vin.length < 11 || vinLoading}
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {vinLoading ? 'Looking up…' : 'Lookup'}
            </button>
          </div>
          {vinData && (
            <p className="mt-2 text-sm text-green-400">
              ✓ {vinData.year} {vinData.make} {vinData.model} {vinData.trim}
            </p>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          Title
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. 2019 Honda Civic EX — 45,000 miles"
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Vehicle specific fields */}
      {form.category === 'vehicle' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Mileage
            </label>
            <input
              type="number"
              value={form.mileage}
              onChange={e => update('mileage', e.target.value)}
              placeholder="e.g. 45000"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Color
            </label>
            <input
              type="text"
              value={form.color}
              onChange={e => update('color', e.target.value)}
              placeholder="e.g. Midnight Blue"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Describe the condition, history, and anything a buyer should know…"
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          Asking price
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
          <input
            type="number"
            value={form.price}
            onChange={e => update('price', e.target.value)}
            placeholder="0.00"
            min="1"
            step="0.01"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">City</label>
          <input
            type="text"
            value={form.location_city}
            onChange={e => update('location_city', e.target.value)}
            placeholder="Newark"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">State</label>
          <input
            type="text"
            value={form.location_state}
            onChange={e => update('location_state', e.target.value.toUpperCase())}
            placeholder="NJ"
            maxLength={2}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">ZIP</label>
          <input
            type="text"
            value={form.location_zip}
            onChange={e => update('location_zip', e.target.value)}
            placeholder="07001"
            maxLength={5}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          Photos (required)
        </label>
        <PhotoUpload photos={photos} onChange={setPhotos} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating listing…' : 'Create listing'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marketplace/ListingForm.tsx
git commit -m "feat: add ListingForm component with VIN lookup and photo upload"
```

---

## Task 7: ListingCard Component

**Files:**
- Create: `src/components/marketplace/ListingCard.tsx`

- [ ] **Step 1: Create the listing card**

Create `src/components/marketplace/ListingCard.tsx`:

```typescript
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Listing } from '@/types/listing';

interface ListingCardProps {
  listing: Listing;
}

function getPhotoUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from('listing-photos')
    .getPublicUrl(path);
  return data.publicUrl;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export function ListingCard({ listing }: ListingCardProps) {
  const photo = listing.photos[0];
  const vehicle = listing.listing_vehicles;

  return (
    <Link href={`/marketplace/${listing.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition-all hover:bg-white/8">
        {/* Photo */}
        <div className="aspect-[4/3] bg-white/5 overflow-hidden">
          {photo ? (
            <img
              src={getPhotoUrl(photo)}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">
              📷
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
            {listing.title}
          </h3>

          {vehicle && (
            <p className="text-white/40 text-xs">
              {vehicle.mileage?.toLocaleString()} mi
              {vehicle.color && ` · ${vehicle.color}`}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-white font-bold text-lg">
              {formatPrice(listing.price)}
            </span>
            <span className="text-white/30 text-xs">
              {listing.location_city}, {listing.location_state}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marketplace/ListingCard.tsx
git commit -m "feat: add ListingCard component"
```

---

## Task 8: Browse Listings Page

**Files:**
- Create: `src/app/marketplace/page.tsx`

- [ ] **Step 1: Create the browse page**

Create `src/app/marketplace/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ListingCard } from '@/components/marketplace/ListingCard';
import type { Listing } from '@/types/listing';

async function getListings(): Promise<Listing[]> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data } = await supabase
    .from('listings')
    .select('*, listing_vehicles(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return data ?? [];
}

export default async function MarketplacePage() {
  const listings = await getListings();

  return (
    <main className="min-h-screen bg-[#060C18] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-white/40 mt-1 text-sm">
              Verified private sellers. Protected transactions.
            </p>
          </div>
          <Link
            href="/marketplace/new"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors"
          >
            + List something
          </Link>
        </div>

        {/* Listings grid */}
        {listings.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <p className="text-white/40 text-lg">No listings yet.</p>
            <Link
              href="/marketplace/new"
              className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
            >
              Be the first to list
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Test the page**

```bash
npm run dev
```

Visit `http://localhost:3000/marketplace`

Expected: Page loads, shows "No listings yet" with a "Be the first to list" button.

- [ ] **Step 3: Commit**

```bash
git add src/app/marketplace/page.tsx
git commit -m "feat: add /marketplace browse page"
```

---

## Task 9: Create Listing Page

**Files:**
- Create: `src/app/marketplace/new/page.tsx`

- [ ] **Step 1: Create the new listing page**

Create `src/app/marketplace/new/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ListingForm } from '@/components/marketplace/ListingForm';

export default async function NewListingPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <main className="min-h-screen bg-[#060C18] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create a listing</h1>
          <p className="text-white/40 mt-1 text-sm">
            Your identity will be verified before the listing goes live.
          </p>
        </div>
        <ListingForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Test the page**

Visit `http://localhost:3000/marketplace/new`

Expected: Redirects to sign in if not logged in. Shows the form if logged in.

- [ ] **Step 3: Commit**

```bash
git add src/app/marketplace/new/page.tsx
git commit -m "feat: add /marketplace/new create listing page"
```

---

## Task 10: Single Listing Page

**Files:**
- Create: `src/app/marketplace/[id]/page.tsx`

- [ ] **Step 1: Create the listing detail page**

Create `src/app/marketplace/[id]/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Listing } from '@/types/listing';

async function getListing(id: string): Promise<Listing | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data } = await supabase
    .from('listings')
    .select('*, listing_vehicles(*)')
    .eq('id', id)
    .single();

  return data ?? null;
}

function getPhotoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const vehicle = listing.listing_vehicles;

  return (
    <main className="min-h-screen bg-[#060C18] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Back */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
        >
          ← Back to listings
        </Link>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10">

          {/* Photos */}
          <div className="space-y-2">
            {listing.photos.length > 0 ? (
              <>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5">
                  <img
                    src={getPhotoUrl(listing.photos[0])}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {listing.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.photos.slice(1, 5).map((p, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
                        <img
                          src={getPhotoUrl(p)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[4/3] rounded-2xl bg-white/5 flex items-center justify-center text-white/20 text-5xl">
                📷
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
              <p className="text-white/40 text-sm mt-1">
                {listing.location_city}, {listing.location_state}
              </p>
            </div>

            <div className="text-4xl font-bold text-indigo-400">
              {formatPrice(listing.price)}
            </div>

            {/* Vehicle specs */}
            {vehicle && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-3">
                  Vehicle details
                </h3>
                {[
                  vehicle.vin && { label: 'VIN', value: vehicle.vin },
                  vehicle.mileage && { label: 'Mileage', value: `${vehicle.mileage.toLocaleString()} miles` },
                  vehicle.color && { label: 'Color', value: vehicle.color },
                  vehicle.drive_type && { label: 'Drive type', value: vehicle.drive_type },
                  vehicle.fuel_type && { label: 'Fuel type', value: vehicle.fuel_type },
                  vehicle.body_class && { label: 'Body style', value: vehicle.body_class },
                ].filter(Boolean).map(({ label, value }: any) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-2">
                  Description
                </h3>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {/* CTA — placeholder for Phase 2 */}
            <div className="rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-4 space-y-3">
              <p className="text-sm text-white/60">
                Interested? Contact the seller through DealSense for a protected transaction.
              </p>
              <button
                disabled
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold opacity-50 cursor-not-allowed"
              >
                Contact seller (coming soon)
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Test the full flow**

1. Go to `http://localhost:3000/marketplace/new`
2. Sign in if needed
3. Enter a VIN and click Lookup
4. Fill in the remaining fields
5. Upload at least one photo
6. Submit the form
7. Expected: Redirected to the listing detail page showing your new listing
8. Go to `http://localhost:3000/marketplace`
9. Expected: Your listing appears in the grid

- [ ] **Step 3: Commit**

```bash
git add src/app/marketplace/[id]/page.tsx
git commit -m "feat: add /marketplace/[id] listing detail page"
```

---

## Task 11: Build and Deploy

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with `/marketplace`, `/marketplace/new`, and `/marketplace/[id]` in the route list. Fix any TypeScript errors before proceeding.

- [ ] **Step 2: Deploy**

```bash
vercel --prod
```

Expected: Deployment succeeds. Visit `https://dealsense.space/marketplace` to confirm the page is live.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — core marketplace with listings, VIN decode, photos"
git push origin main
```

---

## Phase 1 Complete ✓

At this point you have:
- A working marketplace at `/marketplace`
- Sellers can create listings with VIN auto-fill and photo upload
- Buyers can browse and view listings
- All data stored in Supabase with proper RLS

**Next:** Phase 2 — Identity verification, messaging, and offers.
