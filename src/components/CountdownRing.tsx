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
    ? 'bg-red-600 dark:bg-red-500'
    : isUrgent
    ? 'bg-amber-500 dark:bg-amber-400'
    : 'bg-emerald-600 dark:bg-emerald-500';

  const textColorClass = isCritical
    ? 'text-red-600 dark:text-red-400'
    : isUrgent
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-slate-700 dark:text-slate-200';

  return (
    <div
      className="w-14 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center gap-1.5 shrink-0"
      aria-label={`${remainingSeconds}${secondsShort}`}
    >
      <span className={`text-xs font-mono font-bold tabular-nums leading-none ${textColorClass}`}>
        {remainingSeconds}
        {secondsShort}
      </span>
      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full w-full origin-left transition-transform duration-300 ease-linear ${barColorClass}`}
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
    </div>
  );
}
