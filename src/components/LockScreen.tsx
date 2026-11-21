import React, { useState } from 'react';
import { Eye, EyeOff, Globe, Lock, Moon, ShieldAlert, Sun } from 'lucide-react';
import { Translations } from '../lib/i18n';
import { Language, ThemeMode } from '../types';

const APP_LOGO_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_000000002b0482468abe72240ce92705_43f8ec1c.webp`;
const GATE_WALLPAPER_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_0000000063188246b2dc4e77b1130652_ad6f1a5e.webp`;

interface LockScreenProps {
  t: Translations;
  lang: Language;
  theme: ThemeMode;
  isSiteGate?: boolean;
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

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden ${
        isSiteGate
          ? 'bg-black text-white'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      }`}
    >
      {isSiteGate && (
        <div className="fixed inset-0 z-0 pointer-events-none select-none">
          <img
            src={GATE_WALLPAPER_URL}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/25" />
        </div>
      )}

      <div
        className={`relative z-10 flex items-center justify-between px-6 py-4 ${
          isSiteGate
            ? 'bg-transparent border-transparent'
            : 'border-b border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={APP_LOGO_URL}
            alt="KIRON - XP"
            className="w-9 h-9 rounded-xl object-cover object-center shrink-0 shadow-sm"
          />
          <span
            className={`text-lg font-bold tracking-tight ${
              isSiteGate ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]' : ''
            }`}
          >
            {isSiteGate ? 'KIRON - XP' : t.appName}
          </span>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div
          className={`w-full ${
            isSiteGate
              ? 'max-w-sm bg-transparent px-4 py-6 text-center'
              : 'max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8'
          }`}
        >
          {isSiteGate ? (
            <div className="flex items-center justify-center mb-5">
              <div className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center shadow-xl ring-1 ring-white/30">
                <img
                  src={APP_LOGO_URL}
                  alt="KIRON - XP"
                  className="w-full h-full object-cover object-center block"
                />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
          )}

          <h1
            className={`text-xl font-bold tracking-tight ${
              isSiteGate
                ? 'text-white text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {isSiteGate ? t.siteLockTitle : t.vaultLockedTitle}
          </h1>
          <p
            className={`mt-2 text-sm leading-relaxed ${
              isSiteGate
                ? 'text-white/95 text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isSiteGate ? t.siteLockDesc : t.vaultLockedDesc}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                      ? 'w-full px-10 py-2.5 text-sm text-center rounded-xl border border-white/40 bg-black/30 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/75 transition-colors shadow-sm'
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
                  ? 'inline-flex items-center justify-center px-5 py-2 bg-transparent border-0 shadow-none text-white hover:text-white/80 disabled:opacity-55 text-base font-semibold tracking-wide transition-opacity cursor-pointer drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'
                  : 'w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors'
              }
            >
              {unlocking ? '...' : isSiteGate ? t.siteUnlockBtn : t.unlockBtn}
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
    </div>
  );
}
