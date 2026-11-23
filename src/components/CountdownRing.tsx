interface CountdownRingProps {
  remainingSeconds: number;
  period: number;
  secondsShort: string;
}

export function CountdownRing({ remainingSeconds, period, secondsShort }: CountdownRingProps) {
  const fraction = Math.max(0, Math.min(1, remainingSeconds / period));

  const isUrgent = remainingSeconds <= 5;
  const isCritical = remainingSeconds <= 3;

  const barColorClass = isCritical
    ? 'bg-red-400'
    : isUrgent
    ? 'bg-amber-400'
    : 'bg-emerald-400';

  const textColorClass = isCritical
    ? 'text-red-300'
    : isUrgent
    ? 'text-amber-300'
    : 'text-white';

  return (
    <div
      className="w-14 px-1 py-0.5 bg-transparent flex flex-col items-center gap-1 shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
      aria-label={`${remainingSeconds}${secondsShort}`}
    >
      <span className={`text-xs font-mono font-bold tabular-nums leading-none ${textColorClass}`}>
        {remainingSeconds}
        {secondsShort}
      </span>
      <div className="w-full h-1 rounded-full bg-white/25 overflow-hidden">
        <div
          className={`h-full w-full origin-left transition-transform duration-300 ease-linear ${barColorClass}`}
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
    </div>
  );
}
