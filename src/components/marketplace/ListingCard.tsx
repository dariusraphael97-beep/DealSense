import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Listing } from '@/types/listing';

interface ListingCardProps {
  listing: Listing;
}

function getPhotoUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from('listing-photos')
    .getPublicUrl(path);
  return data.publicUrl;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export function ListingCard({ listing }: ListingCardProps) {
  const photo = listing.photos[0];
  const vehicle = listing.listing_vehicles;

  return (
    <Link href={`/marketplace/${listing.id}`} className="group block">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition-all hover:bg-white/[0.08]">
        <div className="aspect-[4/3] bg-white/5 overflow-hidden">
          {photo ? (
            <img
              src={getPhotoUrl(photo)}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">
              📷
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
            {listing.title}
          </h3>

          {vehicle && (
            <p className="text-white/40 text-xs">
              {vehicle.mileage?.toLocaleString()} mi
              {vehicle.color && ` · ${vehicle.color}`}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-white font-bold text-lg">
              {formatPrice(listing.price)}
            </span>
            <span className="text-white/30 text-xs">
              {listing.location_city}, {listing.location_state}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
