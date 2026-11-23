import React, { useId } from 'react';
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
    badgeClass: 'bg-gradient-to-br from-[#4cf07a] via-[#25D366] to-[#128C7E] text-white',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    settingsLabel: 'Telegram (1)',
    configKey: 'telegramUrl',
    placeholderBn: '@username অথবা https://t.me/...',
    placeholderEn: '@username or https://t.me/...',
    badgeClass: 'bg-gradient-to-b from-[#37AEE2] to-[#1E96C8] text-white',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    settingsLabel: 'TikTok',
    configKey: 'tiktokUrl',
    placeholderBn: '@tiktok_id অথবা TikTok লিংক',
    placeholderEn: '@tiktok_id or TikTok URL',
    badgeClass: 'bg-gradient-to-br from-[#1f1f26] via-[#09090d] to-[#000000] text-white',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    settingsLabel: 'Instagram',
    configKey: 'instagramUrl',
    placeholderBn: '@instagram_id অথবা প্রোফাইল লিংক',
    placeholderEn: '@instagram_id or profile URL',
    badgeClass: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white',
  },
  {
    id: 'wechat',
    label: 'WeChat',
    settingsLabel: 'WeChat',
    configKey: 'wechatUrl',
    placeholderBn: 'WeChat আইডি অথবা লিংক',
    placeholderEn: 'WeChat ID or link',
    badgeClass: 'bg-gradient-to-b from-[#38E54D] via-[#07C160] to-[#05964B] text-white',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    settingsLabel: 'Facebook',
    configKey: 'facebookUrl',
    placeholderBn: 'Facebook আইডি বা প্রোফাইল লিংক',
    placeholderEn: 'Facebook username or profile URL',
    badgeClass: 'bg-gradient-to-b from-[#2A8CFF] via-[#1877F2] to-[#0E5CD0] text-white',
  },
  {
    id: 'imo',
    label: 'imo',
    settingsLabel: 'imo',
    configKey: 'imoUrl',
    placeholderBn: 'imo নম্বর বা আইডি / লিংক',
    placeholderEn: 'imo number, ID, or invite URL',
    badgeClass: 'bg-gradient-to-br from-[#23D4FF] via-[#008CFF] to-[#0057E0] text-white',
  },
  {
    id: 'messenger',
    label: 'Messenger',
    settingsLabel: 'Messenger',
    configKey: 'messengerUrl',
    placeholderBn: 'Messenger আইডি বা m.me/ লিংক',
    placeholderEn: 'Messenger username or m.me link',
    badgeClass: 'bg-gradient-to-tr from-[#0099FF] via-[#A033FF] to-[#FF5280] text-white',
  },
  {
    id: 'whatsapp2',
    label: 'WhatsApp',
    settingsLabel: 'WhatsApp (2)',
    configKey: 'whatsappUrl2',
    placeholderBn: '২য় WhatsApp নম্বর অথবা লিংক',
    placeholderEn: '2nd WhatsApp number or link',
    badgeClass: 'bg-gradient-to-br from-[#4cf07a] via-[#25D366] to-[#128C7E] text-white',
  },
  {
    id: 'telegram2',
    label: 'Telegram',
    settingsLabel: 'Telegram (2)',
    configKey: 'telegramUrl2',
    placeholderBn: '২য় Telegram ইউজারনেম বা লিংক',
    placeholderEn: '2nd Telegram username or link',
    badgeClass: 'bg-gradient-to-b from-[#37AEE2] to-[#1E96C8] text-white',
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
  className = 'w-full h-full',
}: {
  id: SocialAppId;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');

  switch (id) {
    case 'whatsapp':
    case 'whatsapp2':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`wa-bg-${uid}`} x1="16%" y1="0%" x2="84%" y2="100%">
              <stop offset="0%" stopColor="#61FD7D" />
              <stop offset="52%" stopColor="#25D366" />
              <stop offset="100%" stopColor="#128C7E" />
            </linearGradient>
            <linearGradient id={`wa-inner-${uid}`} x1="25%" y1="0%" x2="75%" y2="100%">
              <stop offset="0%" stopColor="#3EF278" />
              <stop offset="100%" stopColor="#179C68" />
            </linearGradient>
            <filter id={`wa-sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#064e3b" floodOpacity="0.35" />
            </filter>
          </defs>
          <rect width="64" height="64" fill={`url(#wa-bg-${uid})`} />
          <g filter={`url(#wa-sh-${uid})`}>
            <path
              d="M32.1 13.5c-10.2 0-18.5 8.2-18.5 18.4 0 3.3.9 6.6 2.5 9.4l-2.7 9.8 10.1-2.6a18.6 18.6 0 0 0 8.6 2.1c10.2 0 18.5-8.2 18.5-18.4S42.3 13.5 32.1 13.5z"
              fill="#FFFFFF"
            />
            <path
              d="M32.1 16.9c-8.3 0-15 6.7-15 15 0 2.9.8 5.8 2.4 8.2l.4.6-1.6 5.8 6-1.5.6.3c2.2 1.3 4.7 2 7.2 2 8.3 0 15-6.7 15-15s-6.7-15-15-15z"
              fill={`url(#wa-inner-${uid})`}
            />
            <path
              d="M40.7 36.1c-.4-.2-2.6-1.3-3-1.4-.4-.1-.7-.2-1 .2-.3.5-1.1 1.4-1.4 1.7-.3.3-.5.3-.9.1-2.1-.9-3.9-2.2-5.4-4.1-.3-.4-.1-.6.2-.9.3-.3.6-.7.7-1 .2-.3.1-.6 0-.8-.1-.2-1-2.4-1.4-3.2-.4-.8-.7-.7-1-.7h-.9c-.3 0-.8.1-1.2.6-1.4 1.4-1.7 3.7-.4 6 2 3.4 4.8 6.1 8.4 7.7 1.3.6 2.4.9 3.2 1.1 1.3.3 2.5.3 3.4.1 1-.2 2.6-1.1 3-2.1.4-1 .4-1.9.3-2.1-.2-.2-.5-.3-.9-.5z"
              fill="#FFFFFF"
            />
          </g>
        </svg>
      );

    case 'telegram':
    case 'telegram2':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`tg-bg-${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#3AB7EE" />
              <stop offset="55%" stopColor="#26A2DC" />
              <stop offset="100%" stopColor="#1B87C2" />
            </linearGradient>
            <filter id={`tg-sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0c4a6e" floodOpacity="0.32" />
            </filter>
          </defs>
          <rect width="64" height="64" fill={`url(#tg-bg-${uid})`} />
          <g filter={`url(#tg-sh-${uid})`}>
            <path
              d="M47.4 16.9L14.5 29.6c-2.2.9-2.2 2.2-.4 2.7l8.4 2.6 19.6-12.3c.9-.6 1.8-.3 1.1.3L27.4 37.2l-.7 9c.9 0 1.3-.4 1.8-.9l4.3-4.1 8.9 6.6c1.6.9 2.8.4 3.2-1.5l5.8-27.3c.6-2.4-.9-3.4-3.3-2.1z"
              fill="#FFFFFF"
            />
            <path
              d="M27.4 37.2l-4.9-2.3 19.6-12.3c.5-.3 1.1-.1.6.3L27.4 37.2z"
              fill="#D4E8F6"
            />
            <path
              d="M26.7 46.2l.7-9 5.4 4-4.3 4.1c-.5.5-.9.9-1.8.9z"
              fill="#B3D3E8"
            />
          </g>
        </svg>
      );

    case 'tiktok':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`tt-bg-${uid}`} cx="32%" cy="24%" r="78%">
              <stop offset="0%" stopColor="#262630" />
              <stop offset="55%" stopColor="#101015" />
              <stop offset="100%" stopColor="#030305" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill={`url(#tt-bg-${uid})`} />
          <g transform="translate(-1.4, -1.2)">
            <path
              d="M39.5 14.5h-5.6v24c0 3.1-2.5 5.6-5.6 5.6s-5.6-2.5-5.6-5.6 2.5-5.6 5.6-5.6c.6 0 1.2.1 1.7.3v-5.7c-.6-.1-1.1-.1-1.7-.1-6.2 0-11.2 5-11.2 11.2S22.1 49.8 28.3 49.8s11.2-5 11.2-11.2V26.2c2.3 1.7 5.2 2.7 8.3 2.7v-5.6c-4.5 0-8.3-3.9-8.3-8.8z"
              fill="#25F4EE"
            />
          </g>
          <g transform="translate(1.6, 1.4)">
            <path
              d="M39.5 14.5h-5.6v24c0 3.1-2.5 5.6-5.6 5.6s-5.6-2.5-5.6-5.6 2.5-5.6 5.6-5.6c.6 0 1.2.1 1.7.3v-5.7c-.6-.1-1.1-.1-1.7-.1-6.2 0-11.2 5-11.2 11.2S22.1 49.8 28.3 49.8s11.2-5 11.2-11.2V26.2c2.3 1.7 5.2 2.7 8.3 2.7v-5.6c-4.5 0-8.3-3.9-8.3-8.8z"
              fill="#FE2C55"
            />
          </g>
          <path
            d="M39.5 14.5h-5.6v24c0 3.1-2.5 5.6-5.6 5.6s-5.6-2.5-5.6-5.6 2.5-5.6 5.6-5.6c.6 0 1.2.1 1.7.3v-5.7c-.6-.1-1.1-.1-1.7-.1-6.2 0-11.2 5-11.2 11.2S22.1 49.8 28.3 49.8s11.2-5 11.2-11.2V26.2c2.3 1.7 5.2 2.7 8.3 2.7v-5.6c-4.5 0-8.3-3.9-8.3-8.8z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'instagram':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`ig-warm-${uid}`} cx="28%" cy="105%" r="125%">
              <stop offset="0%" stopColor="#FFDD55" />
              <stop offset="16%" stopColor="#FFDD55" />
              <stop offset="52%" stopColor="#FF543E" />
              <stop offset="100%" stopColor="#C837AB" />
            </radialGradient>
            <radialGradient id={`ig-blue-${uid}`} cx="12%" cy="6%" r="68%">
              <stop offset="0%" stopColor="#3771C8" />
              <stop offset="28%" stopColor="#4F5BD5" stopOpacity="0.92" />
              <stop offset="72%" stopColor="#8134AF" stopOpacity="0" />
            </radialGradient>
            <filter id={`ig-sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#4c0519" floodOpacity="0.32" />
            </filter>
          </defs>
          <rect width="64" height="64" fill={`url(#ig-warm-${uid})`} />
          <rect width="64" height="64" fill={`url(#ig-blue-${uid})`} />
          <g filter={`url(#ig-sh-${uid})`}>
            <rect
              x="14.5"
              y="14.5"
              width="35"
              height="35"
              rx="10.2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.2"
            />
            <circle
              cx="32"
              cy="32"
              r="8.7"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.2"
            />
            <circle cx="42.1" cy="21.9" r="2.6" fill="#FFFFFF" />
          </g>
        </svg>
      );

    case 'wechat':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`wc-bg-${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#4FE640" />
              <stop offset="55%" stopColor="#07C160" />
              <stop offset="100%" stopColor="#059B4D" />
            </linearGradient>
            <filter id={`wc-sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#064e3b" floodOpacity="0.32" />
            </filter>
          </defs>
          <rect width="64" height="64" fill={`url(#wc-bg-${uid})`} />
          <g filter={`url(#wc-sh-${uid})`}>
            {/* Back left speech bubble */}
            <path
              d="M26.8 14.8c-8.7 0-15.7 5.8-15.7 13 0 4.1 2.2 7.8 5.8 10.2l-1.5 4.5 5.2-2.6c1.9.6 4 .9 6.2.9.6 0 1.3 0 1.9-.1-.4-1.1-.6-2.3-.6-3.5 0-6.5 5.9-11.8 13.2-11.8.6 0 1.2 0 1.8.1-1.3-6.1-7.9-10.7-16.3-10.7z"
              fill="#FFFFFF"
            />
            <circle cx="21.5" cy="23.9" r="1.9" fill="#07C160" />
            <circle cx="31.5" cy="23.9" r="1.9" fill="#07C160" />
            {/* Front right speech bubble */}
            <path
              d="M40.3 26.8c-7.2 0-13.1 4.9-13.1 11s5.9 11 13.1 11c1.8 0 3.6-.3 5.2-.9l4.4 2.3-1.2-4c2.9-2 4.7-5 4.7-8.4 0-6.1-5.9-11-13.1-11z"
              fill="#F2FFF5"
              stroke="#07C160"
              strokeWidth="1.2"
            />
            <circle cx="35.9" cy="35.6" r="1.6" fill="#07C160" />
            <circle cx="44.5" cy="35.6" r="1.6" fill="#07C160" />
          </g>
        </svg>
      );

    case 'facebook':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`fb-bg-${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#3596FF" />
              <stop offset="50%" stopColor="#1877F2" />
              <stop offset="100%" stopColor="#0C58C9" />
            </linearGradient>
            <filter id={`fb-sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.28" />
            </filter>
          </defs>
          <rect width="64" height="64" fill={`url(#fb-bg-${uid})`} />
          <path
            filter={`url(#fb-sh-${uid})`}
            d="M42.8 41.2l1.6-10.2h-9.7v-6.6c0-2.8 1.4-5.5 5.8-5.5H45v-8.7s-4.1-.7-8-.7c-8.2 0-13.5 4.9-13.5 13.9V31h-9v10.2h9V64h11.2V41.2h8.1z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'imo':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`imo-bg-${uid}`} x1="18%" y1="0%" x2="82%" y2="100%">
              <stop offset="0%" stopColor="#3CE0FF" />
              <stop offset="50%" stopColor="#0095FF" />
              <stop offset="100%" stopColor="#0056D6" />
            </linearGradient>
            <filter id={`imo-sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#0c4a6e" floodOpacity="0.34" />
            </filter>
          </defs>
          <rect width="64" height="64" fill={`url(#imo-bg-${uid})`} />
          <g filter={`url(#imo-sh-${uid})`}>
            <path
              d="M32 13.5c-11.2 0-20 7.7-20 17.5 0 5.3 2.6 10.1 6.9 13.4l-2 6.8 7.5-3.6c2.4.7 5 1.1 7.6 1.1 11.2 0 20-7.7 20-17.5S43.2 13.5 32 13.5z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.6"
              strokeLinejoin="round"
            />
            <text
              x="32"
              y="36.2"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="16.5"
              fontWeight="800"
              fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
              letterSpacing="-0.7"
            >
              imo
            </text>
          </g>
        </svg>
      );

    case 'messenger':
      return (
        <svg
          viewBox="0 0 64 64"
          shapeRendering="geometricPrecision"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`ms-bg-${uid}`} cx="18%" cy="92%" r="122%">
              <stop offset="0%" stopColor="#0099FF" />
              <stop offset="52%" stopColor="#A033FF" />
              <stop offset="86%" stopColor="#FF5280" />
              <stop offset="100%" stopColor="#FF7061" />
            </radialGradient>
            <linearGradient id={`ms-bolt-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0099FF" />
              <stop offset="55%" stopColor="#A033FF" />
              <stop offset="100%" stopColor="#FF5280" />
            </linearGradient>
            <filter id={`ms-sh-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#4c1d95" floodOpacity="0.34" />
            </filter>
          </defs>
          <rect width="64" height="64" fill={`url(#ms-bg-${uid})`} />
          <g filter={`url(#ms-sh-${uid})`}>
            <path
              d="M32 13c-11.2 0-20 8.2-20 18.7 0 5.9 2.9 11.2 7.5 14.6V53l6.8-3.7c1.8.5 3.7.8 5.7.8 11.2 0 20-8.2 20-18.4S43.2 13 32 13z"
              fill="#FFFFFF"
            />
            <path
              d="M21 37l8.2-13.1 4.2 4.5 8-4.5-8.2 13.1-4.2-4.5L21 37z"
              fill={`url(#ms-bolt-${uid})`}
            />
          </g>
        </svg>
      );
  }
}
