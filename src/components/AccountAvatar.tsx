interface AccountAvatarProps {
  issuer: string;
  avatarDataUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AVATAR_PALETTES = [
  'bg-emerald-950/55 text-emerald-200 border-white/25',
  'bg-sky-950/55 text-sky-200 border-white/25',
  'bg-indigo-950/55 text-indigo-200 border-white/25',
  'bg-amber-950/55 text-amber-200 border-white/25',
  'bg-teal-950/55 text-teal-200 border-white/25',
  'bg-black/45 text-white border-white/25',
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
        className={`${sizeClass} object-cover border border-white/30 shrink-0 bg-black/30 shadow-md`}
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
