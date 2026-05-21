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

// POST — make an offer
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { amount, message } = await req.json();
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
  }

  // Get conversation to verify buyer and get listing/seller ids
  const { data: conv } = await supabase
    .from('conversations')
    .select('listing_id, buyer_id, seller_id')
    .eq('id', params.id)
    .single();

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (conv.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Only the buyer can make offers' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('offers')
    .insert({
      conversation_id: params.id,
      listing_id: conv.listing_id,
      buyer_id: conv.buyer_id,
      seller_id: conv.seller_id,
      amount,
      message: message?.trim() ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH — accept or decline an offer
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { offer_id, status } = await req.json();
  if (!offer_id || !['accepted', 'declined', 'withdrawn'].includes(status)) {
    return NextResponse.json({ error: 'offer_id and valid status are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('offers')
    .update({ status })
    .eq('id', offer_id)
    .eq('conversation_id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
