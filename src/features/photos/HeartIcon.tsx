export function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? '#e2455c' : 'none'}
      stroke={filled ? '#e2455c' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2.2 5 5.6 5c2 0 3.4 1 4.4 2.4C11 6 12.4 5 14.4 5c3.4 0 5 3.4 3.6 6.7C19.5 16.4 12 21 12 21Z" />
    </svg>
  )
}
