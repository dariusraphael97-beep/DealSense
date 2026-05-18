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
      await supabase.from('listings').delete().eq('id', listing.id);
      return NextResponse.json({ error: vehicleError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: listing.id }, { status: 201 });
}
