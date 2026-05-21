import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Use service role client for webhook — bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_IDENTITY_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const session = event.data.object as Stripe.Identity.VerificationSession;
  const userId = session.metadata?.user_id;

  if (!userId) {
    return NextResponse.json({ error: 'No user_id in metadata' }, { status: 400 });
  }

  if (event.type === 'identity.verification_session.verified') {
    await supabaseAdmin
      .from('identity_verifications')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  if (event.type === 'identity.verification_session.requires_input') {
    await supabaseAdmin
      .from('identity_verifications')
      .update({ status: 'failed' })
      .eq('user_id', userId);
  }

  return NextResponse.json({ received: true });
}
