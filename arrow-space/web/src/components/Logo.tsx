export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Arrow Space"
      fill="none"
    >
      <rect width="32" height="32" rx="8" fill="url(#arw-grad)" />
      {/* Upward arrow / flight vector */}
      <path
        d="M16 6 L25 23 L16 18.5 L7 23 Z"
        fill="white"
        fillOpacity="0.95"
      />
      <defs>
        <linearGradient id="arw-grad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#2f6df6" />
          <stop offset="1" stopColor="#1c336f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={`text-base font-semibold tracking-tight ${
            light ? "text-white" : "text-ink"
          }`}
        >
          Arrow Space
        </span>
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.18em] ${
            light ? "text-brand-200" : "text-slate-400"
          }`}
        >
          Aerospace Parts
        </span>
      </span>
    </span>
  );
}
