import { Sprout } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="LocalLoops">
      <span className="brand__sprout" aria-hidden="true"><Sprout size={21} strokeWidth={2.1} /></span>
      {!compact && <span>LocalLoops</span>}
    </div>
  )
}
