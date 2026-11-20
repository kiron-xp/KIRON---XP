interface AccountAvatarProps {
  issuer: string;
  avatarDataUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AVATAR_PALETTES = [
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
  'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70',
  'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70',
  'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70',
  'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/70',
  'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
];

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return 'P';
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getPaletteClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

export function AccountAvatar({ issuer, avatarDataUrl, size = 'md' }: AccountAvatarProps) {
  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9 text-xs rounded-lg'
      : size === 'lg'
      ? 'w-14 h-14 text-base rounded-xl'
      : 'w-11 h-11 text-sm rounded-xl';

  if (avatarDataUrl) {
    return (
      <img
        src={avatarDataUrl}
        alt={issuer}
        referrerPolicy="no-referrer"
        className={`${sizeClass} object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${getPaletteClass(issuer)} border flex items-center justify-center font-semibold tracking-tight shrink-0 select-none`}
      aria-hidden="true"
    >
      {getInitials(issuer)}
    </div>
  );
}
