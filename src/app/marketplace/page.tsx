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
