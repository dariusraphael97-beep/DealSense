export default function VerifyCompletePage() {
  return (
    <main className="min-h-screen bg-[#060C18] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-green-400">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Verification submitted</h1>
        <p className="text-white/50 text-sm">
          Your verification is being processed. Your badge will appear on your listings within a few minutes.
        </p>
        <a
          href="/marketplace"
          className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
        >
          Back to marketplace
        </a>
      </div>
    </main>
  );
}
