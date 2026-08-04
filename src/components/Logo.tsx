export function Logo({ size = 32, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src={`${import.meta.env.BASE_URL}rona-logo.png`}
        alt="RONA"
        width={size}
        height={size}
        style={{ borderRadius: size * 0.22, display: 'block', objectFit: 'cover' }}
      />
      {withWordmark && (
        <span style={{ fontWeight: 700, fontSize: size * 0.56, letterSpacing: -0.3, color: 'var(--color-text)' }}>
          RONA <span style={{ fontWeight: 500, opacity: 0.75 }}>Technická podpora</span>
        </span>
      )}
    </div>
  );
}
