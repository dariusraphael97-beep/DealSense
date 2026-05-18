export type ListingStatus = 'active' | 'pending' | 'sold' | 'removed';
export type ListingCategory = 'vehicle' | 'watch' | 'jewelry' | 'electronics' | 'other';

export interface ListingVehicle {
  id: string;
  listing_id: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number | null;
  color: string | null;
  body_class: string | null;
  drive_type: string | null;
  fuel_type: string | null;
  engine_cylinders: string | null;
  displacement: string | null;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: ListingCategory;
  status: ListingStatus;
  photos: string[];
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  created_at: string;
  updated_at: string;
  listing_vehicles?: ListingVehicle | null;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  category: ListingCategory;
  photos: string[];
  location_city: string;
  location_state: string;
  location_zip: string;
  vehicle?: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim: string;
    mileage: number;
    color: string;
    body_class: string;
    drive_type: string;
    fuel_type: string;
    engine_cylinders: string;
    displacement: string;
  };
}
