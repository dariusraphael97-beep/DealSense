# Phase 2: Trust Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add identity verification (Stripe Identity), in-platform messaging, and an offer system so buyers and sellers can connect and negotiate safely inside DealSense.

**Architecture:** New Supabase tables for identity_verifications, conversations, messages, and offers. Stripe Identity creates a hosted verification session — user completes it on Stripe's UI, webhook updates status in our DB. Messaging is Supabase-backed with real-time subscriptions. The listing detail page gets a Contact Seller button and a Verified badge.

**Tech Stack:** Next.js 14 App Router, Supabase, Stripe Identity, Stripe webhooks, TypeScript, Tailwind CSS.

**Prerequisites:**
- Phase 1 must be complete (listings, photos, VIN decode all working)
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` already in `.env.local`
- Need to add `STRIPE_IDENTITY_WEBHOOK_SECRET` to `.env.local` (see Task 3)

---

## File Map

**New files:**
- `supabase/migrations/002_trust_layer.sql`
- `src/types/message.ts`
- `src/app/api/verify/route.ts` — create Stripe Identity session
- `src/app/api/verify/webhook/route.ts` — Stripe webhook handler
- `src/app/verify/page.tsx` — verification landing page
- `src/app/api/conversations/route.ts` — create conversation
- `src/app/api/conversations/[id]/messages/route.ts` — get + send messages
- `src/app/api/conversations/[id]/offers/route.ts` — create + respond to offers
- `src/app/messages/page.tsx` — inbox (list all conversations)
- `src/app/messages/[id]/page.tsx` — conversation thread with messages + offers
- `src/components/marketplace/ContactSellerButton.tsx` — client button to start conversation
- `src/components/marketplace/VerifiedBadge.tsx` — verified seller badge

**Modified files:**
- `src/app/marketplace/[id]/page.tsx` — add VerifiedBadge + ContactSellerButton to listing detail

---

## Task 1: Database Schema

**Files:**
- Create: `supabase/migrations/002_trust_layer.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/002_trust_layer.sql`:

```sql
-- Identity verifications
create table if not exists identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_session_id text,
  status text not null default 'unverified'
    check (status in ('unverified', 'pending', 'verified', 'failed')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conversations (one per buyer+listing pair)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) not null,
  seller_id uuid references auth.users(id) not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  unique(listing_id, buyer_id)
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Offers
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  listing_id uuid references listings(id) not null,
  buyer_id uuid references auth.users(id) not null,
  seller_id uuid references auth.users(id) not null,
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for identity_verifications updated_at
create trigger identity_verifications_updated_at
  before update on identity_verifications
  for each row execute function update_updated_at();

-- Trigger for offers updated_at
create trigger offers_updated_at
  before update on offers
  for each row execute function update_updated_at();

-- RLS
alter table identity_verifications enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table offers enable row level security;

-- Identity verification policies
create policy "Users can view their own verification"
  on identity_verifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own verification"
  on identity_verifications for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own verification"
  on identity_verifications for update
  to authenticated
  using (auth.uid() = user_id);

-- Allow service role to update verifications (for webhook)
create policy "Service role can update verifications"
  on identity_verifications for update
  using (true);

-- Conversation policies
create policy "Participants can view their conversations"
  on conversations for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyers can create conversations"
  on conversations for insert
  to authenticated
  with check (auth.uid() = buyer_id);

-- Message policies
create policy "Participants can view messages"
  on messages for select
  to authenticated
  using (
    auth.uid() in (
      select buyer_id from conversations where id = conversation_id
      union
      select seller_id from conversations where id = conversation_id
    )
  );

create policy "Participants can send messages"
  on messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id and
    auth.uid() in (
      select buyer_id from conversations where id = conversation_id
      union
      select seller_id from conversations where id = conversation_id
    )
  );

-- Offer policies
create policy "Participants can view offers"
  on offers for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyers can create offers"
  on offers for insert
  to authenticated
  with check (auth.uid() = buyer_id);

create policy "Participants can update offers"
  on offers for update
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Indexes
create index conversations_buyer_id_idx on conversations(buyer_id);
create index conversations_seller_id_idx on conversations(seller_id);
create index conversations_listing_id_idx on conversations(listing_id);
create index messages_conversation_id_idx on messages(conversation_id);
create index messages_created_at_idx on messages(created_at);
create index offers_conversation_id_idx on offers(conversation_id);
```

- [ ] **Step 2: Run migration in Supabase dashboard**

1. Go to Supabase → SQL Editor
2. Paste the SQL above → Run
3. Expected: "Success. No rows returned"

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_trust_layer.sql
git commit -m "feat: add trust layer tables (verifications, conversations, messages, offers)"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/message.ts`

- [ ] **Step 1: Create types file**

Create `src/types/message.ts`:

```typescript
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed';
export type ConversationStatus = 'active' | 'closed';
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface IdentityVerification {
  id: string;
  user_id: string;
  stripe_session_id: string | null;
  status: VerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: ConversationStatus;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Offer {
  id: string;
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: OfferStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/message.ts
git commit -m "feat: add trust layer TypeScript types"
```

---

## Task 3: Stripe Identity API Route

**Files:**
- Create: `src/app/api/verify/route.ts`

**Before implementing:** Add `STRIPE_IDENTITY_WEBHOOK_SECRET` to `.env.local` (get from Stripe dashboard when you set up the webhook in Task 4 setup).

- [ ] **Step 1: Create the verify route**

Create `src/app/api/verify/route.ts`:

```typescript
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
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
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
```

- [ ] **Step 2: Add NEXT_PUBLIC_SITE_URL to .env.local**

Add this line to `.env.local`:
```
NEXT_PUBLIC_SITE_URL=https://dealsense.space
```

Also add to Vercel environment variables in the dashboard.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/verify/route.ts
git commit -m "feat: add Stripe Identity verification API route"
```

---

## Task 4: Stripe Webhook Handler

**Files:**
- Create: `src/app/api/verify/webhook/route.ts`

**Manual setup required first:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://dealsense.space/api/verify/webhook`
3. Select event: `identity.verification_session.verified` and `identity.verification_session.requires_input`
4. Copy the webhook signing secret → add to `.env.local` as `STRIPE_IDENTITY_WEBHOOK_SECRET`
5. Also add to Vercel environment variables

- [ ] **Step 1: Create the webhook handler**

Create `src/app/api/verify/webhook/route.ts`:

```typescript
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
```

- [ ] **Step 2: Add SUPABASE_SERVICE_ROLE_KEY to .env.local**

Get from Supabase → Settings → API → service_role key.

Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Also add to Vercel environment variables.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/verify/webhook/route.ts
git commit -m "feat: add Stripe Identity webhook handler"
```

---

## Task 5: Verification Page

**Files:**
- Create: `src/app/verify/page.tsx`
- Create: `src/app/verify/complete/page.tsx`

- [ ] **Step 1: Create the verification page**

Create `src/app/verify/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('loading');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/verify')
      .then(r => r.json())
      .then(d => setStatus(d.status));
  }, []);

  async function startVerification() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/verify', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Could not start verification');
        setStarting(false);
      }
    } catch {
      setError('Network error — please try again');
      setStarting(false);
    }
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#060C18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </main>
    );
  }

  if (status === 'verified') {
    return (
      <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold">Identity Verified</h1>
          <p className="text-white/50">Your listings now show a Verified badge.</p>
          <button
            onClick={() => router.push('/marketplace')}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
          >
            Back to marketplace
          </button>
        </div>
      </main>
    );
  }

  if (status === 'pending') {
    return (
      <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto text-3xl">
            ⏳
          </div>
          <h1 className="text-2xl font-bold">Verification Pending</h1>
          <p className="text-white/50">We're reviewing your identity. This usually takes a few minutes.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-3xl">
            🪪
          </div>
          <h1 className="text-2xl font-bold">Verify your identity</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Verified sellers get a badge on their listings, building trust with buyers.
            Takes about 2 minutes. Powered by Stripe.
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
          {[
            'Government-issued ID (passport or driver\'s license)',
            'A photo of yourself',
            'Done in 2 minutes',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-white/60">
              <span className="text-indigo-400">✓</span>
              {item}
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          onClick={startVerification}
          disabled={starting}
          className="w-full py-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {starting ? 'Starting…' : 'Start verification'}
        </button>

        <p className="text-center text-xs text-white/30">
          Your ID is processed securely by Stripe and never stored by DealSense.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create the verification complete page**

Create `src/app/verify/complete/page.tsx`:

```typescript
export default function VerifyCompletePage() {
  return (
    <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold">Verification submitted</h1>
        <p className="text-white/50 text-sm">
          Your verification is being processed. Your badge will appear on your listings within a few minutes.
        </p>
        <a
          href="/marketplace"
          className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
        >
          Back to marketplace
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/verify/
git commit -m "feat: add identity verification pages"
```

---

## Task 6: VerifiedBadge Component

**Files:**
- Create: `src/components/marketplace/VerifiedBadge.tsx`

- [ ] **Step 1: Create the badge component**

Create `src/components/marketplace/VerifiedBadge.tsx`:

```typescript
export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const classes = size === 'md'
    ? 'px-3 py-1 text-xs gap-1.5'
    : 'px-2 py-0.5 text-[10px] gap-1';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${classes}`}
      style={{
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.25)',
        color: 'rgb(134,239,172)',
      }}>
      <svg viewBox="0 0 12 12" fill="none" className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'}>
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Verified seller
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marketplace/VerifiedBadge.tsx
git commit -m "feat: add VerifiedBadge component"
```

---

## Task 7: Conversations and Messages API

**Files:**
- Create: `src/app/api/conversations/route.ts`
- Create: `src/app/api/conversations/[id]/messages/route.ts`
- Create: `src/app/api/conversations/[id]/offers/route.ts`

- [ ] **Step 1: Create conversations route**

Create `src/app/api/conversations/route.ts`:

```typescript
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
```

- [ ] **Step 2: Create messages route**

Create `src/app/api/conversations/[id]/messages/route.ts`:

```typescript
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

// GET messages for a conversation
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.id,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 3: Create offers route**

Create `src/app/api/conversations/[id]/offers/route.ts`:

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/conversations/
git commit -m "feat: add conversations, messages, and offers API routes"
```

---

## Task 8: ContactSellerButton Component

**Files:**
- Create: `src/components/marketplace/ContactSellerButton.tsx`

- [ ] **Step 1: Create the button component**

Create `src/components/marketplace/ContactSellerButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ContactSellerButtonProps {
  listingId: string;
  isOwner: boolean;
}

export function ContactSellerButton({ listingId, isOwner }: ContactSellerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isOwner) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
        <p className="text-white/40 text-sm">This is your listing.</p>
      </div>
    );
  }

  async function startConversation() {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          initial_message: message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/signin');
          return;
        }
        setError(data.error ?? 'Could not send message');
        return;
      }

      router.push(`/messages/${data.id}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <div className="rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-4 space-y-3">
        <p className="text-sm text-white/60">
          Contact the seller through DealSense for a protected transaction.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
        >
          Contact seller
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-4 space-y-3">
      <p className="text-sm font-medium text-white/70">Send a message to the seller</p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Hi, I'm interested in this. Is it still available?"
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={startConversation}
          disabled={loading || !message.trim()}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marketplace/ContactSellerButton.tsx
git commit -m "feat: add ContactSellerButton component"
```

---

## Task 9: Messages Pages

**Files:**
- Create: `src/app/messages/page.tsx`
- Create: `src/app/messages/[id]/page.tsx`

- [ ] **Step 1: Create the messages inbox**

Create `src/app/messages/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function MessagesPage() {
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

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, listings(id, title, photos, price)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <main className="min-h-screen bg-[#060C18] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>

        {!conversations?.length ? (
          <div className="text-center py-16 text-white/40">
            <p>No messages yet.</p>
            <Link href="/marketplace" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">
              Browse listings →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv: any) => {
              const listing = conv.listings;
              const photo = listing?.photos?.[0];
              const isBuyer = conv.buyer_id === user.id;
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    {photo ? (
                      <img
                        src={`${supabaseUrl}/storage/v1/object/public/listing-photos/${photo}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xl">📷</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{listing?.title ?? 'Listing'}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {isBuyer ? 'You are the buyer' : 'You are the seller'}
                    </p>
                  </div>
                  <span className="text-white/30 text-sm font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing?.price ?? 0)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create the conversation thread page**

Create `src/app/messages/[id]/page.tsx`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { MessageThread } from '@/components/marketplace/MessageThread';

async function getConversationData(id: string, userId: string) {
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

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, listings(id, title, photos, price)')
    .eq('id', id)
    .single();

  if (!conversation) return null;
  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) return null;

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false });

  return { conversation, messages: messages ?? [], offers: offers ?? [] };
}

export default async function ConversationPage({
  params,
}: {
  params: { id: string };
}) {
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

  const data = await getConversationData(params.id, user.id);
  if (!data) notFound();

  const { conversation, messages, offers } = data;
  const listing = (conversation as any).listings;
  const isBuyer = conversation.buyer_id === user.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <main className="min-h-screen bg-[#060C18] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/messages" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
          ← Back to messages
        </Link>

        {/* Listing summary */}
        {listing && (
          <Link href={`/marketplace/${listing.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all mb-6">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
              {listing.photos?.[0] ? (
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/listing-photos/${listing.photos[0]}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">📷</div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{listing.title}</p>
              <p className="text-white/40 text-xs">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing.price)}
              </p>
            </div>
          </Link>
        )}

        <MessageThread
          conversationId={params.id}
          userId={user.id}
          isBuyer={isBuyer}
          initialMessages={messages}
          initialOffers={offers}
          listingPrice={listing?.price ?? 0}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/messages/
git commit -m "feat: add messages inbox and conversation pages"
```

---

## Task 10: MessageThread Component

**Files:**
- Create: `src/components/marketplace/MessageThread.tsx`

- [ ] **Step 1: Create the message thread component**

Create `src/components/marketplace/MessageThread.tsx`:

```typescript
'use client';

import { useState } from 'react';
import type { Message, Offer } from '@/types/message';

interface MessageThreadProps {
  conversationId: string;
  userId: string;
  isBuyer: boolean;
  initialMessages: Message[];
  initialOffers: Offer[];
  listingPrice: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MessageThread({
  conversationId,
  userId,
  isBuyer,
  initialMessages,
  initialOffers,
  listingPrice,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingOffer = offers.find(o => o.status === 'pending');

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    setError(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch {
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  }

  async function makeOffer() {
    if (!offerAmount || parseFloat(offerAmount) <= 0) return;
    setSendingOffer(true);
    setError(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(offerAmount), message: offerMessage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOffers(prev => [data, ...prev]);
      setShowOfferForm(false);
      setOfferAmount('');
      setOfferMessage('');
    } catch {
      setError('Failed to send offer');
    } finally {
      setSendingOffer(false);
    }
  }

  async function respondToOffer(offerId: string, status: 'accepted' | 'declined') {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/offers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offerId, status }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOffers(prev => prev.map(o => o.id === offerId ? data : o));
    } catch {
      setError('Failed to update offer');
    }
  }

  return (
    <div className="space-y-4">
      {/* Active offer banner */}
      {pendingOffer && (
        <div className="rounded-xl border p-4 space-y-3"
          style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {isBuyer ? 'Your offer' : 'Incoming offer'}
              </p>
              <p className="text-2xl font-bold text-indigo-400">{formatPrice(pendingOffer.amount)}</p>
              {pendingOffer.message && (
                <p className="text-white/50 text-xs mt-1">{pendingOffer.message}</p>
              )}
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
              Pending
            </span>
          </div>
          {!isBuyer && (
            <div className="flex gap-2">
              <button
                onClick={() => respondToOffer(pendingOffer.id, 'declined')}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => respondToOffer(pendingOffer.id, 'accepted')}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors"
              >
                Accept offer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Accepted offer banner */}
      {offers.find(o => o.status === 'accepted') && (
        <div className="rounded-xl border p-4 text-center space-y-1"
          style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <p className="text-green-400 font-semibold text-sm">Offer accepted!</p>
          <p className="text-white/50 text-xs">
            {formatPrice(offers.find(o => o.status === 'accepted')!.amount)} — Escrow payment coming in Phase 3.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">No messages yet.</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                isMe
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white/10 text-white rounded-bl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-indigo-200/60' : 'text-white/30'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Make offer form */}
      {isBuyer && !pendingOffer && !offers.find(o => o.status === 'accepted') && showOfferForm && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white/70">Make an offer</p>
          <p className="text-xs text-white/40">Asking price: {formatPrice(listingPrice)}</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
            <input
              type="number"
              value={offerAmount}
              onChange={e => setOfferAmount(e.target.value)}
              placeholder="Your offer"
              min="1"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <input
            type="text"
            value={offerMessage}
            onChange={e => setOfferMessage(e.target.value)}
            placeholder="Optional note to seller"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowOfferForm(false)}
              className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={makeOffer}
              disabled={sendingOffer || !offerAmount}
              className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {sendingOffer ? 'Sending…' : 'Send offer'}
            </button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="flex gap-2 items-end">
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message…"
          rows={2}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={sendMessage}
            disabled={sendingMessage || !newMessage.trim()}
            className="px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
          {isBuyer && !pendingOffer && !offers.find(o => o.status === 'accepted') && (
            <button
              onClick={() => setShowOfferForm(true)}
              className="px-4 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors"
            >
              Offer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marketplace/MessageThread.tsx
git commit -m "feat: add MessageThread component with messaging and offers"
```

---

## Task 11: Update Listing Detail Page

**Files:**
- Modify: `src/app/marketplace/[id]/page.tsx`

- [ ] **Step 1: Update the listing detail page**

The current `src/app/marketplace/[id]/page.tsx` needs two additions:
1. Import and use `VerifiedBadge` if the seller is verified
2. Replace the disabled CTA with `ContactSellerButton`

Open `src/app/marketplace/[id]/page.tsx` and make these changes:

**Add these imports** at the top (after existing imports):
```typescript
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import { ContactSellerButton } from '@/components/marketplace/ContactSellerButton';
```

**Update `getListing` to also fetch seller verification status:**

Replace the existing `getListing` function with:
```typescript
async function getListing(id: string) {
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

  const { data: listing } = await supabase
    .from('listings')
    .select('*, listing_vehicles(*)')
    .eq('id', id)
    .single();

  if (!listing) return null;

  const { data: verification } = await supabase
    .from('identity_verifications')
    .select('status')
    .eq('user_id', listing.seller_id)
    .single();

  const { data: { user } } = await supabase.auth.getUser();

  return {
    listing: listing as Listing,
    sellerVerified: verification?.status === 'verified',
    currentUserId: user?.id ?? null,
  };
}
```

**Update the page component** to use the new return shape:
```typescript
export default async function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getListing(params.id);
  if (!result) notFound();

  const { listing, sellerVerified, currentUserId } = result;
  const vehicle = listing.listing_vehicles;
```

**Add VerifiedBadge** next to the listing title (inside the details column):
```typescript
<div>
  <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
  <div className="flex items-center gap-2 mt-1">
    <p className="text-white/40 text-sm">
      {listing.location_city}, {listing.location_state}
    </p>
    {sellerVerified && <VerifiedBadge />}
  </div>
</div>
```

**Replace the disabled CTA button** at the bottom of the details column with:
```typescript
<ContactSellerButton
  listingId={listing.id}
  isOwner={currentUserId === listing.seller_id}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/marketplace/[id]/page.tsx
git commit -m "feat: add VerifiedBadge and ContactSellerButton to listing detail"
```

---

## Task 12: Build and Deploy

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with `/marketplace/[id]`, `/messages`, `/messages/[id]`, `/verify`, `/api/conversations` in the route list. Fix any TypeScript errors.

- [ ] **Step 2: Deploy**

```bash
vercel --prod
```

- [ ] **Step 3: Set environment variables in Vercel**

In Vercel dashboard → Settings → Environment Variables, ensure these are set:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_IDENTITY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 2 complete — identity verification, messaging, offers"
git push origin main
```

---

## Phase 2 Complete ✓

At this point you have:
- Sellers can verify their identity at `/verify`
- Verified sellers get a green badge on their listings
- Buyers can contact sellers through in-platform messaging
- Buyers can make offers, sellers can accept or decline
- All communication is protected inside DealSense

**Next:** Phase 3 — Stripe Connect escrow, bill of sale, and transaction completion.
