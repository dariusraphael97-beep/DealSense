import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Listing } from '@/types/listing';

async function getListing(id: string): Promise<Listing | null> {
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
    .eq('id', id)
    .single();

  return data ?? null;
}

function getPhotoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function ListingPage({
  params,
}: {
  params: { id: string };
}) {
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const vehicle = listing.listing_vehicles;

  return (
    <main className="min-h-screen bg-[#060C18] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
        >
          ← Back to listings
        </Link>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10">
          <div className="space-y-2">
            {listing.photos.length > 0 ? (
              <>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5">
                  <img
                    src={getPhotoUrl(listing.photos[0])}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {listing.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.photos.slice(1, 5).map((p, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
                        <img
                          src={getPhotoUrl(p)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[4/3] rounded-2xl bg-white/5 flex items-center justify-center text-white/20 text-5xl">
                📷
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
              <p className="text-white/40 text-sm mt-1">
                {listing.location_city}, {listing.location_state}
              </p>
            </div>

            <div className="text-4xl font-bold text-indigo-400">
              {formatPrice(listing.price)}
            </div>

            {vehicle && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-3">
                  Vehicle details
                </h3>
                {([
                  vehicle.vin ? { label: 'VIN', value: vehicle.vin } : null,
                  vehicle.mileage ? { label: 'Mileage', value: `${vehicle.mileage.toLocaleString()} miles` } : null,
                  vehicle.color ? { label: 'Color', value: vehicle.color } : null,
                  vehicle.drive_type ? { label: 'Drive type', value: vehicle.drive_type } : null,
                  vehicle.fuel_type ? { label: 'Fuel type', value: vehicle.fuel_type } : null,
                  vehicle.body_class ? { label: 'Body style', value: vehicle.body_class } : null,
                ] as ({ label: string; value: string } | null)[])
                  .filter((item): item is { label: string; value: string } => item !== null)
                  .map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
              </div>
            )}

            {listing.description && (
              <div>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-2">
                  Description
                </h3>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            <div className="rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-4 space-y-3">
              <p className="text-sm text-white/60">
                Interested? Contact the seller through DealSense for a protected transaction.
              </p>
              <button
                disabled
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold opacity-50 cursor-not-allowed"
              >
                Contact seller (coming soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
