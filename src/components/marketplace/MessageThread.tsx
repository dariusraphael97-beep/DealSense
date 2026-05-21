'use client';

import { useState } from 'react';
import type { Message, Offer } from '@/types/message';

interface MessageThreadProps {
  conversationId: string;
  userId: string;
  isBuyer: boolean;
  initialMessages: Message[];
  initialOffers: Offer[];
  listingPrice: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MessageThread({
  conversationId,
  userId,
  isBuyer,
  initialMessages,
  initialOffers,
  listingPrice,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingOffer = offers.find(o => o.status === 'pending');
  const acceptedOffer = offers.find(o => o.status === 'accepted');

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    setError(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch {
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  }

  async function makeOffer() {
    if (!offerAmount || parseFloat(offerAmount) <= 0) return;
    setSendingOffer(true);
    setError(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(offerAmount), message: offerMessage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOffers(prev => [data, ...prev]);
      setShowOfferForm(false);
      setOfferAmount('');
      setOfferMessage('');
    } catch {
      setError('Failed to send offer');
    } finally {
      setSendingOffer(false);
    }
  }

  async function respondToOffer(offerId: string, status: 'accepted' | 'declined') {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/offers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offerId, status }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOffers(prev => prev.map(o => o.id === offerId ? data : o));
    } catch {
      setError('Failed to update offer');
    }
  }

  return (
    <div className="space-y-4">
      {/* Active offer banner */}
      {pendingOffer && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {isBuyer ? 'Your offer' : 'Incoming offer'}
              </p>
              <p className="text-2xl font-bold text-indigo-400">{formatPrice(pendingOffer.amount)}</p>
              {pendingOffer.message && (
                <p className="text-white/50 text-xs mt-1">{pendingOffer.message}</p>
              )}
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
              Pending
            </span>
          </div>
          {!isBuyer && (
            <div className="flex gap-2">
              <button
                onClick={() => respondToOffer(pendingOffer.id, 'declined')}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-colors cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={() => respondToOffer(pendingOffer.id, 'accepted')}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                Accept offer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Accepted offer banner */}
      {acceptedOffer && (
        <div
          className="rounded-xl border p-4 text-center space-y-1"
          style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}
        >
          <p className="text-green-400 font-semibold text-sm">Offer accepted!</p>
          <p className="text-white/50 text-xs">
            {formatPrice(acceptedOffer.amount)} — Escrow payment coming in Phase 3.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">No messages yet.</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                isMe
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white/10 text-white rounded-bl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-indigo-200/60' : 'text-white/30'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Make offer form */}
      {isBuyer && !pendingOffer && !acceptedOffer && showOfferForm && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white/70">Make an offer</p>
          <p className="text-xs text-white/40">Asking price: {formatPrice(listingPrice)}</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
            <input
              type="number"
              value={offerAmount}
              onChange={e => setOfferAmount(e.target.value)}
              placeholder="Your offer"
              min="1"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <input
            type="text"
            value={offerMessage}
            onChange={e => setOfferMessage(e.target.value)}
            placeholder="Optional note to seller"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowOfferForm(false)}
              className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={makeOffer}
              disabled={sendingOffer || !offerAmount}
              className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {sendingOffer ? 'Sending…' : 'Send offer'}
            </button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="flex gap-2 items-end">
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message…"
          rows={2}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500 resize-none"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={sendMessage}
            disabled={sendingMessage || !newMessage.trim()}
            className="px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Send
          </button>
          {isBuyer && !pendingOffer && !acceptedOffer && (
            <button
              onClick={() => setShowOfferForm(true)}
              className="px-4 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors cursor-pointer"
            >
              Offer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
