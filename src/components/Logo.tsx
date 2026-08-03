export function Logo({ size = 32, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="44" height="44" rx="12" fill="#4338CA" />
        <path
          d="M14 19a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a2.5 2.5 0 0 0 0 5v2a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3v-2a2.5 2.5 0 0 0 0-5v-2Z"
          fill="white"
        />
        <path d="m21 23.5 2.4 2.5L28 21" stroke="#4338CA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withWordmark && (
        <span style={{ fontWeight: 700, fontSize: size * 0.62, letterSpacing: -0.3, color: 'var(--color-text)' }}>
          Ticado
        </span>
      )}
    </div>
  );
}
