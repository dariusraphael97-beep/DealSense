'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('loading');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/verify')
      .then(r => r.json())
      .then(d => setStatus(d.status));
  }, []);

  async function startVerification() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/verify', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Could not start verification');
        setStarting(false);
      }
    } catch {
      setError('Network error — please try again');
      setStarting(false);
    }
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#060C18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </main>
    );
  }

  if (status === 'verified') {
    return (
      <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-green-400">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Identity Verified</h1>
          <p className="text-white/50">Your listings now show a Verified badge.</p>
          <button
            onClick={() => router.push('/marketplace')}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            Back to marketplace
          </button>
        </div>
      </main>
    );
  }

  if (status === 'pending') {
    return (
      <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-yellow-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Verification Pending</h1>
          <p className="text-white/50">We&apos;re reviewing your identity. This usually takes a few minutes.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-indigo-400">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 18c0-2 1.5-3 3-3s3 1 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M15 9h3M15 13h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Verify your identity</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Verified sellers get a badge on their listings, building trust with buyers.
            Takes about 2 minutes. Powered by Stripe.
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
          {[
            "Government-issued ID (passport or driver's license)",
            'A photo of yourself',
            'Done in 2 minutes',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-white/60">
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 text-indigo-400 flex-shrink-0">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {item}
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          onClick={startVerification}
          disabled={starting}
          className="w-full py-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {starting ? 'Starting…' : 'Start verification'}
        </button>

        <p className="text-center text-xs text-white/30">
          Your ID is processed securely by Stripe and never stored by DealSense.
        </p>
      </div>
    </main>
  );
}
