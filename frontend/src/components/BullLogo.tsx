/**
 * Cute chibi bull logo — 牛 represents 牛市 (bull market).
 * Drawn at 40×40 viewBox, rendered at any size via className.
 */
export default function BullLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      className={className}
      aria-label="牛市 logo"
    >
      {/* Horns */}
      <path
        d="M14 10 Q9 2 13 5"
        stroke="#b45309"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M26 10 Q31 2 27 5"
        stroke="#b45309"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left ear (drawn before head so head overlaps) */}
      <circle cx="8" cy="16" r="5.5" fill="#f59e0b" />
      <circle cx="8" cy="16" r="3.2" fill="#fbbf24" />

      {/* Right ear */}
      <circle cx="32" cy="16" r="5.5" fill="#f59e0b" />
      <circle cx="32" cy="16" r="3.2" fill="#fbbf24" />

      {/* Head */}
      <circle cx="20" cy="21" r="13" fill="#f59e0b" />

      {/* Eyes */}
      <circle cx="14.5" cy="18" r="2.8" fill="#1c1917" />
      <circle cx="25.5" cy="18" r="2.8" fill="#1c1917" />
      {/* Eye shine */}
      <circle cx="15.6" cy="16.7" r="1.1" fill="white" />
      <circle cx="26.6" cy="16.7" r="1.1" fill="white" />

      {/* Muzzle */}
      <ellipse cx="20" cy="26" rx="6" ry="4" fill="#d97706" />
      {/* Nostrils */}
      <ellipse cx="17.2" cy="26.6" rx="1.4" ry="1.1" fill="#92400e" />
      <ellipse cx="22.8" cy="26.6" rx="1.4" ry="1.1" fill="#92400e" />

      {/* Smile */}
      <path
        d="M15.5 31 Q20 34 24.5 31"
        stroke="#92400e"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
