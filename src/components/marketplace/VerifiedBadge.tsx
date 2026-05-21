export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const classes = size === 'md'
    ? 'px-3 py-1 text-xs gap-1.5'
    : 'px-2 py-0.5 text-[10px] gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${classes}`}
      style={{
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.25)',
        color: 'rgb(134,239,172)',
      }}
    >
      <svg viewBox="0 0 12 12" fill="none" className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'}>
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Verified seller
    </span>
  );
}
