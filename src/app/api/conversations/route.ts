import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// GET /api/conversations — get all conversations for current user
export async function GET() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      listings (id, title, photos, price)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/conversations — start a conversation with a seller
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { listing_id, initial_message } = await req.json();

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }

  // Get the listing to find the seller
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', listing_id)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: 'Cannot contact your own listing' }, { status: 400 });
  }

  // Upsert conversation (one per buyer+listing)
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .upsert({
      listing_id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
    }, { onConflict: 'listing_id,buyer_id' })
    .select()
    .single();

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });

  // Send initial message if provided
  if (initial_message?.trim()) {
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: initial_message.trim(),
    });
  }

  return NextResponse.json({ id: conversation.id }, { status: 201 });
}
