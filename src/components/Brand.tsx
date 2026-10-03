export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Greet Meet">
      <svg className="brand__mark" viewBox="0 0 42 36" role="img" aria-hidden="true">
        <circle cx="30" cy="9" r="7" fill="currentColor" className="brand__sun" />
        <path d="M2 31 15.3 10l9.1 14.3L29 18l12 13H2Z" fill="currentColor" />
        <path d="m11.4 31 9.1-13.8L29 31H11.4Z" fill="#eaf0e6" opacity=".85" />
      </svg>
      {!compact && <span>Greet Meet</span>}
    </div>
  )
}
