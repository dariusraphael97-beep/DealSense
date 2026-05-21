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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xl">
                        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{listing?.title ?? 'Listing'}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {isBuyer ? 'You are the buyer' : 'You are the seller'}
                    </p>
                  </div>
                  <span className="text-white/30 text-sm font-bold flex-shrink-0">
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
