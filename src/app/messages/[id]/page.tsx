import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { MessageThread } from '@/components/marketplace/MessageThread';
import type { Message, Offer } from '@/types/message';

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

  return {
    conversation,
    messages: (messages ?? []) as Message[],
    offers: (offers ?? []) as Offer[],
  };
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listing = (conversation as any).listings;
  const isBuyer = conversation.buyer_id === user.id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <main className="min-h-screen bg-[#060C18] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/messages"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
        >
          ← Back to messages
        </Link>

        {/* Listing summary */}
        {listing && (
          <Link
            href={`/marketplace/${listing.id}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all mb-6"
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
              {listing.photos?.[0] ? (
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/listing-photos/${listing.photos[0]}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
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
