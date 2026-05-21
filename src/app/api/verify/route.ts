import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST() {
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if already verified
  const { data: existing } = await supabase
    .from('identity_verifications')
    .select('status')
    .eq('user_id', user.id)
    .single();

  if (existing?.status === 'verified') {
    return NextResponse.json({ error: 'Already verified' }, { status: 400 });
  }

  // Create Stripe Identity verification session
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { user_id: user.id },
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/verify/complete`,
  });

  // Upsert verification record with pending status
  await supabase
    .from('identity_verifications')
    .upsert({
      user_id: user.id,
      stripe_session_id: session.id,
      status: 'pending',
    }, { onConflict: 'user_id' });

  return NextResponse.json({ url: session.url });
}

export async function GET() {
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
  if (!user) {
    return NextResponse.json({ status: 'unverified' });
  }

  const { data } = await supabase
    .from('identity_verifications')
    .select('status')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({ status: data?.status ?? 'unverified' });
}
