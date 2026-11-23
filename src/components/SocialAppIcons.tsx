import React from 'react';
import { SiteEntryConfig } from '../types';

export type SocialAppId =
  | 'whatsapp'
  | 'telegram'
  | 'tiktok'
  | 'instagram'
  | 'wechat'
  | 'facebook'
  | 'imo'
  | 'messenger'
  | 'whatsapp2'
  | 'telegram2';

export type SocialConfigKey =
  | 'whatsappUrl'
  | 'telegramUrl'
  | 'tiktokUrl'
  | 'instagramUrl'
  | 'wechatUrl'
  | 'facebookUrl'
  | 'imoUrl'
  | 'messengerUrl'
  | 'whatsappUrl2'
  | 'telegramUrl2';

export interface SocialAppMeta {
  id: SocialAppId;
  label: string;
  settingsLabel: string;
  configKey: SocialConfigKey;
  placeholderBn: string;
  placeholderEn: string;
  badgeClass: string;
}

export const SOCIAL_APPS: SocialAppMeta[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    settingsLabel: 'WhatsApp (1)',
    configKey: 'whatsappUrl',
    placeholderBn: '017... অথবা +88017... বা লিংক',
    placeholderEn: '+88017... or https://wa.me/...',
    badgeClass: 'bg-gradient-to-br from-[#6ee7b7] via-[#22c55e] to-[#047857] text-white',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    settingsLabel: 'Telegram (1)',
    configKey: 'telegramUrl',
    placeholderBn: '@username অথবা https://t.me/...',
    placeholderEn: '@username or https://t.me/...',
    badgeClass: 'bg-gradient-to-br from-[#67e8f9] via-[#0ea5e9] to-[#1d4ed8] text-white',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    settingsLabel: 'TikTok',
    configKey: 'tiktokUrl',
    placeholderBn: '@tiktok_id অথবা TikTok লিংক',
    placeholderEn: '@tiktok_id or TikTok URL',
    badgeClass: 'bg-gradient-to-br from-[#4c1d95] via-[#18181b] to-[#09090b] text-white',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    settingsLabel: 'Instagram',
    configKey: 'instagramUrl',
    placeholderBn: '@instagram_id অথবা প্রোফাইল লিংক',
    placeholderEn: '@instagram_id or profile URL',
    badgeClass: 'bg-gradient-to-tr from-[#fde047] via-[#ec4899] to-[#7c3aed] text-white',
  },
  {
    id: 'wechat',
    label: 'WeChat',
    settingsLabel: 'WeChat',
    configKey: 'wechatUrl',
    placeholderBn: 'WeChat আইডি অথবা লিংক',
    placeholderEn: 'WeChat ID or link',
    badgeClass: 'bg-gradient-to-br from-[#86efac] via-[#10b981] to-[#0f766e] text-white',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    settingsLabel: 'Facebook',
    configKey: 'facebookUrl',
    placeholderBn: 'Facebook আইডি বা প্রোফাইল লিংক',
    placeholderEn: 'Facebook username or profile URL',
    badgeClass: 'bg-gradient-to-br from-[#7dd3fc] via-[#2563eb] to-[#3730a3] text-white',
  },
  {
    id: 'imo',
    label: 'imo',
    settingsLabel: 'imo',
    configKey: 'imoUrl',
    placeholderBn: 'imo নম্বর বা আইডি / লিংক',
    placeholderEn: 'imo number, ID, or invite URL',
    badgeClass: 'bg-gradient-to-br from-[#a5f3fc] via-[#0284c7] to-[#1e40af] text-white',
  },
  {
    id: 'messenger',
    label: 'Messenger',
    settingsLabel: 'Messenger',
    configKey: 'messengerUrl',
    placeholderBn: 'Messenger আইডি বা m.me/ লিংক',
    placeholderEn: 'Messenger username or m.me link',
    badgeClass: 'bg-gradient-to-tr from-[#38bdf8] via-[#a855f7] to-[#f43f5e] text-white',
  },
  {
    id: 'whatsapp2',
    label: 'WhatsApp',
    settingsLabel: 'WhatsApp (2)',
    configKey: 'whatsappUrl2',
    placeholderBn: '২য় WhatsApp নম্বর অথবা লিংক',
    placeholderEn: '2nd WhatsApp number or link',
    badgeClass: 'bg-gradient-to-br from-[#6ee7b7] via-[#22c55e] to-[#047857] text-white',
  },
  {
    id: 'telegram2',
    label: 'Telegram',
    settingsLabel: 'Telegram (2)',
    configKey: 'telegramUrl2',
    placeholderBn: '২য় Telegram ইউজারনেম বা লিংক',
    placeholderEn: '2nd Telegram username or link',
    badgeClass: 'bg-gradient-to-br from-[#67e8f9] via-[#0ea5e9] to-[#1d4ed8] text-white',
  },
];

export type ResolvedSocialAction =
  | { type: 'link'; href: string }
  | { type: 'modal'; label: string; value: string; openHref?: string };

function normalizeWhatsAppLink(raw: string): string {
  if (!raw) return 'https://wa.me';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(raw)) {
    return `https://${raw}`;
  }
  let digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('01')) {
    digits = `88${digits}`;
  }
  return digits ? `https://wa.me/${digits}` : 'https://wa.me';
}

function normalizeTelegramLink(raw: string): string {
  if (!raw) return 'https://t.me';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(t\.me|telegram\.me)\//i.test(raw)) {
    return `https://${raw}`;
  }
  if (/^\+\d{6,}$/.test(raw.replace(/[\s-]/g, ''))) {
    return `https://t.me/${raw.replace(/[\s-]/g, '')}`;
  }
  const handle = raw.replace(/^@+/, '').replace(/^\/+/, '');
  return handle ? `https://t.me/${handle}` : 'https://t.me';
}

export function resolveSocialAppAction(
  id: SocialAppId,
  config?: SiteEntryConfig
): ResolvedSocialAction {
  const meta = SOCIAL_APPS.find((a) => a.id === id)!;
  const raw = (config?.[meta.configKey] ?? '').trim();

  switch (id) {
    case 'whatsapp':
    case 'whatsapp2':
      return { type: 'link', href: normalizeWhatsAppLink(raw) };

    case 'telegram':
    case 'telegram2':
      return { type: 'link', href: normalizeTelegramLink(raw) };

    case 'tiktok': {
      if (!raw) return { type: 'link', href: 'https://www.tiktok.com' };
      if (/^https?:\/\//i.test(raw)) return { type: 'link', href: raw };
      if (/^(www\.)?tiktok\.com\//i.test(raw)) return { type: 'link', href: `https://${raw}` };
      const handle = raw.replace(/^@+/, '').replace(/^\/+/, '');
      return {
        type: 'link',
        href: handle ? `https://www.tiktok.com/@${handle}` : 'https://www.tiktok.com',
      };
    }

    case 'instagram': {
      if (!raw) return { type: 'link', href: 'https://www.instagram.com' };
      if (/^https?:\/\//i.test(raw)) return { type: 'link', href: raw };
      if (/^(www\.)?instagram\.com\//i.test(raw)) return { type: 'link', href: `https://${raw}` };
      const handle = raw.replace(/^@+/, '').replace(/^\/+/, '');
      return {
        type: 'link',
        href: handle ? `https://www.instagram.com/${handle}` : 'https://www.instagram.com',
      };
    }

    case 'wechat': {
      if (!raw) return { type: 'link', href: 'https://www.wechat.com' };
      if (/^(https?:|weixin:)\/\//i.test(raw)) return { type: 'link', href: raw };
      return { type: 'modal', label: 'WeChat ID', value: raw, openHref: 'weixin://' };
    }

    case 'facebook': {
      if (!raw) return { type: 'link', href: 'https://www.facebook.com' };
      if (/^https?:\/\//i.test(raw)) return { type: 'link', href: raw };
      if (/^(www\.|m\.)?(facebook|fb)\.com\//i.test(raw)) {
        return { type: 'link', href: `https://${raw}` };
      }
      if (/^\d{6,}$/.test(raw)) {
        return { type: 'link', href: `https://www.facebook.com/profile.php?id=${raw}` };
      }
      const handle = raw.replace(/^@+/, '').replace(/^\/+/, '');
      return {
        type: 'link',
        href: handle ? `https://www.facebook.com/${handle}` : 'https://www.facebook.com',
      };
    }

    case 'imo': {
      if (!raw) return { type: 'link', href: 'https://imo.im' };
      if (/^(https?:|imo:)\/\//i.test(raw)) return { type: 'link', href: raw };
      const digits = raw.replace(/[^\d+]/g, '');
      return {
        type: 'modal',
        label: 'imo',
        value: raw,
        openHref: digits.length >= 6 ? `tel:${digits}` : undefined,
      };
    }

    case 'messenger': {
      if (!raw) return { type: 'link', href: 'https://www.messenger.com' };
      if (/^https?:\/\//i.test(raw)) return { type: 'link', href: raw };
      if (/^(m\.me|www\.messenger\.com)\//i.test(raw)) {
        return { type: 'link', href: `https://${raw}` };
      }
      const handle = raw
        .replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')
        .replace(/^@+/, '')
        .replace(/^\/+/, '');
      return {
        type: 'link',
        href: handle ? `https://m.me/${handle}` : 'https://www.messenger.com',
      };
    }
  }
}

export function SocialAppLogoSvg({
  id,
  className = 'w-7 h-7',
}: {
  id: SocialAppId;
  className?: string;
}) {
  const shadow = 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]';
  switch (id) {
    case 'whatsapp':
    case 'whatsapp2':
      return (
        <svg viewBox="0 0 24 24" className={`${className} ${shadow} fill-current`} aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.3-1.97 1.38-.52.08-1.18.11-1.91-.12-.44-.14-1-.33-1.72-.64-3.03-1.31-5.01-4.38-5.16-4.58-.15-.2-1.23-1.64-1.23-3.13s.78-2.22 1.06-2.52c.28-.3.61-.38.81-.38.2 0 .41.01.58.01.19 0 .44-.07.69.53.24.6.83 2.09.9 2.24.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.39-.45.53-.15.15-.31.31-.13.61.18.3.79 1.3 1.69 2.1 1.16 1.04 2.14 1.36 2.44 1.51.3.15.48.13.66-.08.18-.2.75-.88.95-1.18.2-.3.4-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.23.58.35.07.13.07.73-.17 1.41z" />
        </svg>
      );
    case 'telegram':
    case 'telegram2':
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${className} ${shadow} fill-current -translate-x-[0.5px]`}
          aria-hidden="true"
        >
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" className={`${className} ${shadow}`} aria-hidden="true">
          <path
            d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
            fill="#25F4EE"
            transform="translate(-0.7,-0.5)"
          />
          <path
            d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
            fill="#FE2C55"
            transform="translate(0.7,0.5)"
          />
          <path
            d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className={`${className} ${shadow}`} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="white" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="2.2" />
          <circle cx="17.2" cy="6.8" r="1.3" fill="white" />
        </svg>
      );
    case 'wechat':
      return (
        <svg viewBox="0 0 24 24" className={`${className} ${shadow} fill-current`} aria-hidden="true">
          <path d="M9.5 4C5.36 4 2 6.84 2 10.35c0 1.97 1.07 3.74 2.77 4.91L4.1 17.5l2.37-1.22c.95.28 1.98.44 3.03.44.34 0 .68-.02 1.01-.06a5.28 5.28 0 0 1-.26-1.63c0-3.04 2.8-5.5 6.25-5.5.25 0 .5.01.74.04C16.65 6.4 13.41 4 9.5 4zm-2.6 4.7a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8zm5.2 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z" />
          <path d="M16.5 10.6c-2.98 0-5.4 2.08-5.4 4.65s2.42 4.65 5.4 4.65c.78 0 1.53-.14 2.21-.4l1.94 1-.52-1.8c1.1-.85 1.77-2.08 1.77-3.45 0-2.57-2.42-4.65-5.4-4.65zm-1.85 3.65a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm3.7 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className={`${className} ${shadow} fill-current`} aria-hidden="true">
          <path d="M14.5 13.5h2.7l.4-3.1h-3.1V8.4c0-.9.3-1.5 1.6-1.5h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H8.4v3.1h2.7V21h3.4v-7.5z" />
        </svg>
      );
    case 'imo':
      return (
        <svg viewBox="0 0 24 24" className={`${className} ${shadow}`} aria-hidden="true">
          <text
            x="12"
            y="15.5"
            textAnchor="middle"
            fill="white"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="-0.4"
          >
            imo
          </text>
        </svg>
      );
    case 'messenger':
      return (
        <svg viewBox="0 0 24 24" className={`${className} ${shadow} fill-current`} aria-hidden="true">
          <path d="M12 2.5C6.48 2.5 2 6.64 2 11.75c0 2.9 1.45 5.49 3.72 7.18V22l3.35-1.84c.91.25 1.89.39 2.93.39 5.52 0 10-4.14 10-9.25S17.52 2.5 12 2.5zm1.03 12.18l-2.55-2.72-4.96 2.72 5.45-5.78 2.61 2.72 4.9-2.72-5.45 5.78z" />
        </svg>
      );
  }
}
