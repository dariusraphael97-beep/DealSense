import { createClient } from '@/lib/supabase/client';
import type { Listing } from '@/types/listing';

export async function getListings(): Promise<Listing[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_vehicles (*)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getListing(id: string): Promise<Listing | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_vehicles (*)
    `)
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (error) return null;
  return data;
}

export function getPhotoUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from('listing-photos')
    .getPublicUrl(path);
  return data.publicUrl;
}
