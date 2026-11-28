import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../lib/i18n';
import { buildOtpAuthUri, generateHOTP, generateTOTP } from '../lib/crypto/otp';
import { AccountEntry } from '../types';
import { AccountAvatar } from './AccountAvatar';
import { CountdownRing } from './CountdownRing';
import { QrCodeCanvas } from './QrCodeCanvas';

interface VaultViewProps {
  t: Translations;
  accounts: AccountEntry[];
  onNavigateAdd: () => void;
  onEditAccount: (account: AccountEntry) => void;
  onDeleteAccount: (id: string) => void;
  onIncrementHotp: (id: string) => void;
}

interface ComputedOtpState {
  code: string;
  remainingSeconds: number;
}

function splitOtpGroups(code: string): [string, string] {
  if (code.length === 8) {
    return [code.slice(0, 4), code.slice(4)];
  }
  if (code.length === 6) {
    return [code.slice(0, 3), code.slice(3)];
  }
  return [code, ''];
}

export function VaultView({
  t,
  accounts,
  onNavigateAdd,
  onEditAccount,
  onDeleteAccount,
  onIncrementHotp,
}: VaultViewProps) {
  const [search, setSearch] = useState('');
  const [otpMap, setOtpMap] = useState<Record<string, ComputedOtpState>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [qrAccount, setQrAccount] = useState<AccountEntry | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-account-menu]')) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (!q) return true;
      const cleanAccName =
        acc.accountName && acc.accountName.trim().toLowerCase() !== 'user'
          ? acc.accountName.toLowerCase()
          : '';
      return (
        acc.issuer.toLowerCase().includes(q) ||
        cleanAccName.includes(q) ||
        (acc.category?.toLowerCase().includes(q) ?? false) ||
        (acc.caption?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [accounts, search]);

  useEffect(() => {
    let mounted = true;

    const computeAll = async () => {
      const now = Date.now();
      const entries = await Promise.all(
        accounts.map(async (acc) => {
          try {
            if (acc.type === 'totp') {
              const res = await generateTOTP(acc.secret, acc.algorithm, acc.digits, acc.period, now);
              return [acc.id, { code: res.code, remainingSeconds: res.remainingSeconds }] as const;
            } else {
              const code = await generateHOTP(acc.secret, acc.counter, acc.algorithm, acc.digits);
              return [acc.id, { code, remainingSeconds: 0 }] as const;
            }
          } catch {
            return [acc.id, { code: '------', remainingSeconds: 0 }] as const;
          }
        })
      );

      if (mounted) {
        const next: Record<string, ComputedOtpState> = {};
        for (const [id, val] of entries) {
          next[id] = val;
        }
        setOtpMap(next);
      }
    };

    computeAll();
    const timer = window.setInterval(computeAll, 250);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [accounts]);

  const handleCopyCode = async (id: string, code: string) => {
    if (!code || code.includes('-')) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleCopyUri = async (acc: AccountEntry) => {
    try {
      await navigator.clipboard.writeText(buildOtpAuthUri(acc));
      setCopiedUri(true);
      window.setTimeout(() => setCopiedUri(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {accounts.length > 0 && (
        <div className="relative w-full">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-11 pr-10 py-2.5 text-sm sm:text-base rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t.close}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {accounts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-2xl mx-auto mt-6 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t.emptyVaultTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t.emptyVaultDesc}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addAccountCta}</span>
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-xs">
          {t.noSearchMatch}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((acc) => {
            const state = otpMap[acc.id] ?? {
              code: acc.digits === 8 ? '--------' : '------',
              remainingSeconds: acc.period,
            };
            const isCopied = copiedId === acc.id;
            const isConfirmingDelete = confirmDeleteId === acc.id;

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center justify-between gap-3 sm:gap-5">
                  {/* Left Side: Avatar+Timer & Account Info */}
                  <div className="min-w-0 flex-1 flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <AccountAvatar issuer={acc.issuer} avatarDataUrl={acc.avatarDataUrl} size="lg" />
                      {acc.type === 'totp' ? (
                        <CountdownRing
                          remainingSeconds={state.remainingSeconds}
                          period={acc.period}
                          secondsShort={t.secondsShort}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onIncrementHotp(acc.id)}
                          title={t.nextCodeHotp}
                          className="w-14 inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>+1</span>
                        </button>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          MD KIRON MONDAL
                        </h3>

                        <div className="relative shrink-0" data-account-menu>
                          <button
                            type="button"
                            onClick={() => setOpenMenuId((prev) => (prev === acc.id ? null : acc.id))}
                            aria-expanded={openMenuId === acc.id}
                            aria-haspopup="menu"
                            title={t.editAccount}
                            aria-label={t.editAccount}
                            className={`inline-flex items-center justify-center p-0.5 rounded transition-colors ${
                              openMenuId === acc.id
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {openMenuId === acc.id && (
                            <div
                              role="menu"
                              className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5 z-40"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEditAccount(acc);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors whitespace-nowrap"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{t.editAccount}</span>
                              </button>

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setQrAccount(acc);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors whitespace-nowrap"
                              >
                                <QrCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{t.showQr}</span>
                              </button>

                              <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setConfirmDeleteId(isConfirmingDelete ? null : acc.id);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>{t.deleteAccount}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {acc.issuer}
                      </p>

                      {acc.accountName && acc.accountName.trim().toLowerCase() !== 'user' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {acc.accountName}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {acc.type.toUpperCase()}
                          {acc.category ? ` - ${acc.category}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        {acc.type === 'totp' ? (
                          <span>
                            {acc.period}
                            {t.secondsShort}
                          </span>
                        ) : (
                          <span>
                            {t.counterLabel}: {acc.counter}
                          </span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>
                          {acc.digits} {t.digitsUnit}
                        </span>
                      </div>

                      {acc.caption && (
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate pt-0.5">
                          {acc.caption}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Bordered Structured 6/8-Digit OTP & Copy Panel */}
                  {(() => {
                    const [partA, partB] = splitOtpGroups(state.code);
                    const isExpiring = acc.type === 'totp' && state.remainingSeconds <= 5;
                    const frameBorderClass = isExpiring
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/25'
                      : 'border-emerald-200 dark:border-emerald-800/80 bg-slate-50/80 dark:bg-slate-950/60';
                    const digitBoxClass = isExpiring
                      ? 'border-amber-200 dark:border-amber-800/80 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300'
                      : 'border-emerald-200/90 dark:border-emerald-800/70 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400';

                    return (
                      <div
                        className={`self-center flex flex-col items-center gap-2 p-2 rounded-xl border transition-colors shrink-0 min-w-[116px] max-w-[175px] ${frameBorderClass}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleCopyCode(acc.id, state.code)}
                          title={t.copyCode}
                          className={`w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border font-mono text-xs sm:text-sm font-bold tracking-[0.12em] tabular-nums cursor-pointer select-all transition-colors ${digitBoxClass}`}
                        >
                          <span>{partA}</span>
                          {partB && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600 font-normal tracking-normal">
                                ·
                              </span>
                              <span>{partB}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyCode(acc.id, state.code)}
                          title={t.copyCode}
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold tracking-wide transition-all duration-150 active:scale-[0.97] whitespace-nowrap ${
                            isCopied
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-slate-950'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{t.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t.secondsShort === 'সে.' ? 'কপি' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Inline Delete Confirmation */}
                {isConfirmingDelete && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs">
                    <span className="text-red-700 dark:text-red-200 font-medium">{t.deleteConfirmMsg}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteAccount(acc.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                      >
                        {t.confirmDelete}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Account QR Inspection Modal */}
      {qrAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 text-slate-900 dark:text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t.qrModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setQrAccount(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <QrCodeCanvas value={buildOtpAuthUri(qrAccount)} size={200} />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {qrAccount.issuer}
                </p>
                {qrAccount.accountName &&
                  qrAccount.accountName.trim().toLowerCase() !== 'user' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {qrAccount.accountName}
                    </p>
                  )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all max-h-24 overflow-y-auto">
              {buildOtpAuthUri(qrAccount)}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleCopyUri(qrAccount)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
              >
                {copiedUri ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUri ? t.copied : t.copyUri}</span>
              </button>
              <button
                type="button"
                onClick={() => setQrAccount(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
