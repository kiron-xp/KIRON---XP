import React, { useState } from 'react';
import { Eye, EyeOff, Globe, Lock, Moon, ShieldAlert, Sun } from 'lucide-react';
import { Translations } from '../lib/i18n';
import { Language, SiteEntryConfig, ThemeMode } from '../types';

const APP_LOGO_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_000000002b0482468abe72240ce92705_43f8ec1c.webp`;
const GATE_WALLPAPER_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_0000000063188246b2dc4e77b1130652_ad6f1a5e.webp`;

const OVERLAY_CLASS_MAP: Record<number, string> = {
  0: 'bg-black/0',
  10: 'bg-black/10',
  20: 'bg-black/20',
  25: 'bg-black/25',
  30: 'bg-black/30',
  40: 'bg-black/40',
  50: 'bg-black/50',
  60: 'bg-black/60',
  70: 'bg-black/70',
  80: 'bg-black/80',
};

function getOverlayClass(opacity?: number): string {
  const steps = [0, 10, 20, 25, 30, 40, 50, 60, 70, 80];
  const val = typeof opacity === 'number' && Number.isFinite(opacity) ? opacity : 25;
  let closest = 25;
  let minDiff = Infinity;
  for (const step of steps) {
    const diff = Math.abs(step - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = step;
    }
  }
  return OVERLAY_CLASS_MAP[closest] ?? 'bg-black/25';
}

function normalizeTelegramHref(raw?: string): string {
  const val = raw?.trim() ?? '';
  if (!val) return 'https://t.me';
  if (/^https?:\/\//i.test(val)) return val;
  const cleaned = val.replace(/^@+/, '').replace(/^t\.me\//i, '');
  return cleaned ? `https://t.me/${cleaned}` : 'https://t.me';
}

function normalizeWhatsAppHref(raw?: string): string {
  const val = raw?.trim() ?? '';
  if (!val) return 'https://wa.me';
  if (/^https?:\/\//i.test(val)) return val;
  const digits = val.replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : 'https://wa.me';
}

interface LockScreenProps {
  t: Translations;
  lang: Language;
  theme: ThemeMode;
  isSiteGate?: boolean;
  siteConfig?: SiteEntryConfig;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onUnlock: (passphrase: string) => Promise<boolean>;
  onResetVault?: () => void;
}

export function LockScreen({
  t,
  lang,
  theme,
  isSiteGate = false,
  siteConfig,
  onToggleLang,
  onToggleTheme,
  onUnlock,
  onResetVault,
}: LockScreenProps) {
  const [passphrase, setPassphrase] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;
    setError('');
    setUnlocking(true);
    try {
      const ok = await onUnlock(passphrase);
      if (!ok) {
        setError(isSiteGate ? t.siteWrongPass : t.wrongPassphrase);
      }
    } catch {
      setError(isSiteGate ? t.siteWrongPass : t.wrongPassphrase);
    } finally {
      setUnlocking(false);
    }
  };

  const wallpaperSrc = siteConfig?.wallpaperDataUrl || GATE_WALLPAPER_URL;
  const overlayClass = getOverlayClass(siteConfig?.overlayOpacity);
  const headerBrand = isSiteGate ? siteConfig?.headerTitle?.trim() || 'KIRON - XP' : t.appName;
  const gateTitle = siteConfig ? siteConfig.lockTitle : t.siteLockTitle;
  const gateDesc = siteConfig ? siteConfig.lockDesc : t.siteLockDesc;
  const gateUnlockLabel = siteConfig?.unlockBtnText?.trim() || t.siteUnlockBtn;
  const showCenterLogo = siteConfig ? siteConfig.showLogo !== false : true;
  const showSocials = siteConfig ? siteConfig.showSocialLinks !== false : true;
  const bioText = siteConfig?.bio?.trim() ?? '';

  return (
    <div
      className={
        isSiteGate
          ? 'fixed inset-0 h-dvh w-full flex flex-col overflow-hidden overscroll-none select-none bg-black text-white'
          : 'min-h-screen flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      }
    >
      {isSiteGate && (
        <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <img
            src={wallpaperSrc}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center"
          />
          <div className={`absolute inset-0 ${overlayClass}`} />
        </div>
      )}

      <div
        className={`relative z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 shrink-0 ${
          isSiteGate
            ? 'bg-transparent border-transparent'
            : 'border-b border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={APP_LOGO_URL}
            alt={headerBrand}
            className="w-9 h-9 rounded-xl object-cover object-center shrink-0 shadow-sm"
          />
          <span
            className={`text-lg font-bold tracking-tight truncate ${
              isSiteGate ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]' : ''
            }`}
          >
            {headerBrand}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isSiteGate
                ? 'bg-black/25 backdrop-blur-sm border border-white/25 text-white hover:bg-black/40'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
              isSiteGate
                ? 'bg-black/25 backdrop-blur-sm border border-white/25 text-white hover:bg-black/40'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div
        className={`relative z-10 flex-1 flex items-center justify-center min-h-0 ${
          isSiteGate ? 'px-5 pb-24 sm:pb-28' : 'p-6'
        }`}
      >
        <div
          className={`w-full ${
            isSiteGate
              ? 'max-w-sm bg-transparent px-4 py-2 text-center'
              : 'max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8'
          }`}
        >
          {isSiteGate ? (
            showCenterLogo && (
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl ring-1 ring-white/30">
                  <img
                    src={APP_LOGO_URL}
                    alt={headerBrand}
                    className="w-full h-full object-cover object-center block"
                  />
                </div>
              </div>
            )
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
          )}

          {(!isSiteGate || gateTitle.trim().length > 0) && (
            <h1
              className={`text-xl font-bold tracking-tight ${
                isSiteGate
                  ? 'text-white text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {isSiteGate ? gateTitle : t.vaultLockedTitle}
            </h1>
          )}

          {(!isSiteGate || gateDesc.trim().length > 0) && (
            <p
              className={`mt-1.5 text-xs sm:text-sm leading-relaxed ${
                isSiteGate
                  ? 'text-white/95 text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {isSiteGate ? gateDesc : t.vaultLockedDesc}
            </p>
          )}

          <form onSubmit={handleSubmit} className={isSiteGate ? 'mt-4 space-y-3' : 'mt-6 space-y-4'}>
            <div>
              {!isSiteGate && (
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.enterPassphrase}
                </label>
              )}
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    if (error) setError('');
                  }}
                  autoComplete="off"
                  autoFocus
                  className={
                    isSiteGate
                      ? 'w-full px-10 py-2.5 text-sm text-center rounded-xl border border-white/45 bg-black/35 backdrop-blur-sm text-white select-text focus:outline-none focus:ring-2 focus:ring-white/45 focus:border-white/80 transition-colors shadow-sm'
                      : 'w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600'
                  }
                  placeholder={isSiteGate ? '' : '••••••••'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 ${
                    isSiteGate
                      ? 'text-white/80 hover:text-white'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  aria-label="Toggle passphrase visibility"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs ${
                  isSiteGate
                    ? 'bg-red-950/75 backdrop-blur-sm border border-red-400/50 text-red-100'
                    : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !passphrase}
              className={
                isSiteGate
                  ? 'inline-flex items-center justify-center px-5 py-1.5 bg-transparent border-0 shadow-none text-white hover:text-white/80 disabled:opacity-55 text-base font-semibold tracking-wide transition-opacity cursor-pointer drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'
                  : 'w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors'
              }
            >
              {unlocking ? '...' : isSiteGate ? gateUnlockLabel : t.unlockBtn}
            </button>
          </form>

          {!isSiteGate && onResetVault && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  {t.forgotResetBtn}
                </button>
              ) : (
                <div className="space-y-3 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                    {t.forgotResetConfirm}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onResetVault}
                      className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                    >
                      {t.confirmResetYes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isSiteGate && (
        <div className="relative z-10 px-4 sm:px-6 pb-4 pt-1 flex items-end justify-between gap-3 shrink-0">
          {bioText ? (
            <div className="max-w-[70%] sm:max-w-md px-3.5 py-2 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 text-xs leading-relaxed text-white/95 shadow-lg">
              <p className="line-clamp-2 break-words whitespace-pre-line">{bioText}</p>
            </div>
          ) : (
            <div className="min-h-9" />
          )}

          {showSocials && (
            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href={normalizeTelegramHref(siteConfig?.telegramUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="w-9 h-9 rounded-full bg-[#229ED9] hover:bg-[#1e8ec4] text-white flex items-center justify-center shadow-lg ring-1 ring-white/30 transition-transform hover:scale-105 active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-current -translate-x-[0.5px]"
                  aria-hidden="true"
                >
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
              </a>
              <a
                href={normalizeWhatsAppHref(siteConfig?.whatsappUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-lg ring-1 ring-white/30 transition-transform hover:scale-105 active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.3-1.97 1.38-.52.08-1.18.11-1.91-.12-.44-.14-1-.33-1.72-.64-3.03-1.31-5.01-4.38-5.16-4.58-.15-.2-1.23-1.64-1.23-3.13s.78-2.22 1.06-2.52c.28-.3.61-.38.81-.38.2 0 .41.01.58.01.19 0 .44-.07.69.53.24.6.83 2.09.9 2.24.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.39-.45.53-.15.15-.31.31-.13.61.18.3.79 1.3 1.69 2.1 1.16 1.04 2.14 1.36 2.44 1.51.3.15.48.13.66-.08.18-.2.75-.88.95-1.18.2-.3.4-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.23.58.35.07.13.07.73-.17 1.41z" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
