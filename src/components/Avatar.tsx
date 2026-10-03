type AvatarProps = {
  initials: string
  color?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function Avatar({ initials, color = 'sage', size = 'medium', className = '' }: AvatarProps) {
  return (
    <span className={`avatar avatar--${color} avatar--${size} ${className}`} aria-label={initials}>
      {initials}
    </span>
  )
}
