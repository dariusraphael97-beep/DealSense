'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ photos, onChange, maxPhotos = 10 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFiles(files: FileList) {
    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);
    setError(null);
    const newPaths: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        setUploading(false);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Each photo must be under 10MB');
        setUploading(false);
        return;
      }

      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(path, file);

      if (uploadError) {
        setError('Upload failed — please try again');
        setUploading(false);
        return;
      }

      newPaths.push(path);
    }

    onChange([...photos, ...newPaths]);
    setUploading(false);
  }

  function removePhoto(path: string) {
    onChange(photos.filter(p => p !== path));
  }

  function getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(path);
    return data.publicUrl;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map(path => (
          <div key={path} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
            <img
              src={getPublicUrl(path)}
              alt="Listing photo"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(path)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/40 hover:border-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-2xl">+</span>
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <p className="text-white/30 text-xs">
        {photos.length}/{maxPhotos} photos · JPG, PNG, WebP · Max 10MB each
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
