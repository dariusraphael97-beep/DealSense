'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ContactSellerButtonProps {
  listingId: string;
  isOwner: boolean;
}

export function ContactSellerButton({ listingId, isOwner }: ContactSellerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isOwner) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
        <p className="text-white/40 text-sm">This is your listing.</p>
      </div>
    );
  }

  async function startConversation() {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          initial_message: message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/signin');
          return;
        }
        setError(data.error ?? 'Could not send message');
        return;
      }

      router.push(`/messages/${data.id}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <div className="rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-4 space-y-3">
        <p className="text-sm text-white/60">
          Contact the seller through DealSense for a protected transaction.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
        >
          Contact seller
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-4 space-y-3">
      <p className="text-sm font-medium text-white/70">Send a message to the seller</p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Hi, I'm interested in this. Is it still available?"
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={startConversation}
          disabled={loading || !message.trim()}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {loading ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </div>
  );
}
