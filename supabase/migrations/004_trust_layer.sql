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
