'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoUpload } from './PhotoUpload';
import type { CreateListingInput } from '@/types/listing';

export function ListingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [vinData, setVinData] = useState<any>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'vehicle' as const,
    location_city: '',
    location_state: '',
    location_zip: '',
    vin: '',
    mileage: '',
    color: '',
  });

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function lookupVin() {
    if (form.vin.length < 11) return;
    setVinLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/vin?vin=${form.vin}`);
      const data = await res.json();
      if (data.make) {
        setVinData(data);
        update('title', `${data.year} ${data.make} ${data.model}${data.trim ? ' ' + data.trim : ''}`);
      } else {
        setError('VIN not found — please check and try again');
      }
    } catch {
      setError('VIN lookup failed — please try again');
    } finally {
      setVinLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (photos.length === 0) {
      setError('Please add at least one photo');
      setLoading(false);
      return;
    }

    const body: CreateListingInput = {
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      photos,
      location_city: form.location_city,
      location_state: form.location_state,
      location_zip: form.location_zip,
      ...(form.category === 'vehicle' && vinData && {
        vehicle: {
          vin: form.vin,
          year: vinData.year,
          make: vinData.make,
          model: vinData.model,
          trim: vinData.trim ?? '',
          mileage: parseInt(form.mileage) || 0,
          color: form.color,
          body_class: vinData.bodyClass ?? '',
          drive_type: vinData.driveType ?? '',
          fuel_type: vinData.fuelType ?? '',
          engine_cylinders: vinData.engineCylinders ?? '',
          displacement: vinData.displacement ?? '',
        },
      }),
    };

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to create listing');
        return;
      }

      router.push(`/marketplace/${data.id}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
        <select
          value={form.category}
          onChange={e => update('category', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="vehicle">Vehicle (car, motorcycle, boat, RV)</option>
          <option value="watch">Watch</option>
          <option value="jewelry">Jewelry</option>
          <option value="electronics">Electronics</option>
          <option value="other">Other</option>
        </select>
      </div>

      {form.category === 'vehicle' && (
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">VIN (auto-fills vehicle details)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.vin}
              onChange={e => update('vin', e.target.value.toUpperCase())}
              placeholder="e.g. 1HGBH41JXMN109186"
              maxLength={17}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={lookupVin}
              disabled={form.vin.length < 11 || vinLoading}
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {vinLoading ? 'Looking up…' : 'Lookup'}
            </button>
          </div>
          {vinData && (
            <p className="mt-2 text-sm text-green-400">
              ✓ {vinData.year} {vinData.make} {vinData.model} {vinData.trim}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. 2019 Honda Civic EX — 45,000 miles"
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {form.category === 'vehicle' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Mileage</label>
            <input
              type="number"
              value={form.mileage}
              onChange={e => update('mileage', e.target.value)}
              placeholder="e.g. 45000"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Color</label>
            <input
              type="text"
              value={form.color}
              onChange={e => update('color', e.target.value)}
              placeholder="e.g. Midnight Blue"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
        <textarea
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Describe the condition, history, and anything a buyer should know…"
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Asking price</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
          <input
            type="number"
            value={form.price}
            onChange={e => update('price', e.target.value)}
            placeholder="0.00"
            min="1"
            step="0.01"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">City</label>
          <input
            type="text"
            value={form.location_city}
            onChange={e => update('location_city', e.target.value)}
            placeholder="Newark"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">State</label>
          <input
            type="text"
            value={form.location_state}
            onChange={e => update('location_state', e.target.value.toUpperCase())}
            placeholder="NJ"
            maxLength={2}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">ZIP</label>
          <input
            type="text"
            value={form.location_zip}
            onChange={e => update('location_zip', e.target.value)}
            placeholder="07001"
            maxLength={5}
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Photos (required)</label>
        <PhotoUpload photos={photos} onChange={setPhotos} />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating listing…' : 'Create listing'}
      </button>
    </form>
  );
}
