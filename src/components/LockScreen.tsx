import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff, Globe, Lock, Moon, ShieldAlert, Sun, X } from 'lucide-react';
import { Translations } from '../lib/i18n';
import { Language, SiteEntryConfig, ThemeMode } from '../types';
import { resolveSocialAppAction, SOCIAL_APPS, SocialAppLogoSvg } from './SocialAppIcons';

const APP_LOGO_URL = `${import.meta.env.BASE_URL}favicon-192x192.png`;
const CENTER_LOGO_URL = `${import.meta.env.BASE_URL}og-image.jpg`;
const GATE_WALLPAPER_URL = `${import.meta.env.BASE_URL}gate-wallpaper.webp`;

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
  const [activeSocialPopup, setActiveSocialPopup] = useState<{
    label: string;
    value: string;
    openHref?: string;
  } | null>(null);
  const [copiedPopup, setCopiedPopup] = useState(false);

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

  const handleCopyPopup = async () => {
    if (!activeSocialPopup) return;
    try {
      await navigator.clipboard.writeText(activeSocialPopup.value);
      setCopiedPopup(true);
      window.setTimeout(() => setCopiedPopup(false), 1800);
    } catch {
      // ignore clipboard errors
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

      {/* Top Bar */}
      <div
        className={`relative z-10 flex items-center justify-between px-5 sm:px-6 py-3 shrink-0 ${
          isSiteGate
            ? 'bg-transparent border-transparent'
            : 'border-b border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={APP_LOGO_URL}
            alt={headerBrand}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover object-center shrink-0 shadow-sm"
          />
          <span
            className={`text-base sm:text-lg font-bold tracking-tight truncate ${
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

      {/* Password Lock Stack (Top area on site gate, centered on vault lock) */}
      <div
        className={`relative z-10 flex justify-center ${
          isSiteGate ? 'items-start px-5 pt-0 sm:pt-2 shrink-0' : 'flex-1 items-center p-6 min-h-0'
        }`}
      >
        <div
          className={`w-full ${
            isSiteGate
              ? 'max-w-sm bg-transparent px-3 py-0.5 text-center'
              : 'max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8'
          }`}
        >
          {isSiteGate ? (
            showCenterLogo && (
              <div className="flex items-center justify-center mb-2.5">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl ring-1 ring-white/30">
                  <img
                    src={CENTER_LOGO_URL}
                    alt="KIRON-XP"
                    width={1254}
                    height={1254}
                    fetchPriority="high"
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
              className={`font-bold tracking-tight ${
                isSiteGate
                  ? 'text-lg sm:text-xl text-white text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                  : 'text-xl text-slate-900 dark:text-slate-100'
              }`}
            >
              {isSiteGate ? gateTitle : t.vaultLockedTitle}
            </h1>
          )}

          {(!isSiteGate || gateDesc.trim().length > 0) && (
            <p
              className={`mt-1 leading-relaxed ${
                isSiteGate
                  ? 'text-[11px] sm:text-xs text-white/95 text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                  : 'text-sm text-slate-600 dark:text-slate-400'
              }`}
            >
              {isSiteGate ? gateDesc : t.vaultLockedDesc}
            </p>
          )}

          <form onSubmit={handleSubmit} className={isSiteGate ? 'mt-2.5 space-y-2' : 'mt-6 space-y-4'}>
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
                      ? 'w-full px-10 py-2 text-sm text-center rounded-xl border border-white/45 bg-black/35 backdrop-blur-sm text-white select-text focus:outline-none focus:ring-2 focus:ring-white/45 focus:border-white/80 transition-colors shadow-sm'
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
                className={`flex items-center justify-center gap-2 p-2 rounded-xl text-xs ${
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
                  ? 'inline-flex items-center justify-center px-5 py-1 bg-transparent border-0 shadow-none text-white hover:text-white/80 disabled:opacity-55 text-base font-semibold tracking-wide transition-opacity cursor-pointer drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'
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

      {/* Higher Positioned Centered 5-Column App Grid with comfortable horizontal & vertical spacing */}
      {isSiteGate && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-5 sm:pt-8 pb-2 px-4 sm:px-6 min-h-0">
          {showSocials && (
            <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto grid grid-cols-5 gap-x-4 gap-y-5 min-[390px]:gap-x-5 min-[390px]:gap-y-5 sm:gap-x-7 sm:gap-y-7 justify-items-center">
              {SOCIAL_APPS.map((app) => {
                const action = resolveSocialAppAction(app.id, siteConfig);
                const iconEl = (
                  <>
                    <span className="relative overflow-hidden w-13 h-13 min-[390px]:w-[54px] min-[390px]:h-[54px] sm:w-15 sm:h-15 rounded-[16px] sm:rounded-[18px] flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.58)] ring-1 ring-white/50 group-hover:ring-white/85 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-active:scale-95">
                      <SocialAppLogoSvg id={app.id} className="w-full h-full block" />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-1 top-0.5 h-3 rounded-full bg-gradient-to-b from-white/35 to-transparent"
                      />
                    </span>
                    <span className="mt-1.5 text-[10.5px] sm:text-[11px] font-medium text-white tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.98)] truncate w-full text-center">
                      {app.label}
                    </span>
                  </>
                );

                if (action.type === 'modal') {
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        setCopiedPopup(false);
                        setActiveSocialPopup({
                          label: action.label,
                          value: action.value,
                          openHref: action.openHref,
                        });
                      }}
                      aria-label={app.settingsLabel}
                      className="group w-13 min-[390px]:w-[54px] sm:w-15 flex flex-col items-center cursor-pointer focus:outline-none"
                    >
                      {iconEl}
                    </button>
                  );
                }

                return (
                  <a
                    key={app.id}
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={app.settingsLabel}
                    className="group w-13 min-[390px]:w-[54px] sm:w-15 flex flex-col items-center focus:outline-none"
                  >
                    {iconEl}
                  </a>
                );
              })}
            </div>
          )}

          {activeSocialPopup && (
            <div className="mt-3 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/25 text-xs text-white shadow-xl max-w-[92vw]">
              <span className="font-semibold text-white/80 shrink-0">
                {activeSocialPopup.label}:
              </span>
              <span className="font-mono text-white truncate select-text max-w-[140px]">
                {activeSocialPopup.value}
              </span>
              <button
                type="button"
                onClick={handleCopyPopup}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 text-[11px] font-medium shrink-0 transition-colors"
              >
                {copiedPopup ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{lang === 'bn' ? 'কপি' : copiedPopup ? 'Copied' : 'Copy'}</span>
              </button>
              {activeSocialPopup.openHref && (
                <a
                  href={activeSocialPopup.openHref}
                  className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold shrink-0 transition-colors"
                >
                  {lang === 'bn' ? 'খুলুন' : 'Open'}
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveSocialPopup(null)}
                aria-label="Close"
                className="p-0.5 text-white/70 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Bio Bar */}
      {isSiteGate && (
        <div className="relative z-10 px-4 sm:px-6 pb-4 pt-1 flex justify-center shrink-0">
          {bioText ? (
            <div className="max-w-md px-4 py-2 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 text-xs leading-relaxed text-white/95 text-center shadow-lg">
              <p className="line-clamp-2 break-words whitespace-pre-line">{bioText}</p>
            </div>
          ) : (
            <div className="min-h-6" />
          )}
        </div>
      )}
    </div>
  );
}
