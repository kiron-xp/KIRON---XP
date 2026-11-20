import React, { useState } from 'react';
import { Eye, EyeOff, Globe, Lock, Moon, ShieldAlert, Sun } from 'lucide-react';
import { Translations } from '../lib/i18n';
import { Language, ThemeMode } from '../types';

const BRAND_PHOTO_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_000000009a148208932f6c5646168244_7b1691f5.png`;

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <img
            src={BRAND_PHOTO_URL}
            alt="KIRON - XP"
            className="w-9 h-9 rounded-lg object-cover border border-emerald-500/40 shrink-0"
          />
          <span className="text-lg font-bold tracking-tight">
            {isSiteGate ? 'KIRON - XP' : t.appName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          {isSiteGate ? (
            <div className="flex justify-center mb-5">
              <img
                src={BRAND_PHOTO_URL}
                alt="KIRON - XP"
                className="w-28 h-28 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-sm"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6" />
            </div>
          )}

          <h1 className={`text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 ${isSiteGate ? 'text-center' : ''}`}>
            {isSiteGate ? t.siteLockTitle : t.vaultLockedTitle}
          </h1>
          <p className={`mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed ${isSiteGate ? 'text-center' : ''}`}>
            {isSiteGate ? t.siteLockDesc : t.vaultLockedDesc}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {isSiteGate ? t.siteEnterPassPlaceholder : t.enterPassphrase}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle passphrase visibility"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !passphrase}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
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

      <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <strong>KIRON - XP</strong> · 2FA Authenticator, Email, Notes &amp; Sheets Vault
      </footer>
    </div>
  );
}
