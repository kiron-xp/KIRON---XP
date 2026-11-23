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
      {/* Transparent Search Bar */}
      {accounts.length > 0 && (
        <div className="relative w-full">
          <Search className="w-5 h-5 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none drop-shadow-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-11 pr-10 py-2.5 text-sm sm:text-base rounded-xl border border-white/25 bg-black/20 backdrop-blur-xs text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/60 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t.close}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/75 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {accounts.length === 0 ? (
        <div className="bg-black/25 backdrop-blur-xs border border-white/20 rounded-2xl p-10 text-center max-w-2xl mx-auto mt-6 text-white">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/35 text-emerald-300 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)]">
            {t.emptyVaultTitle}
          </h2>
          <p className="mt-2 text-sm text-white/80 max-w-md mx-auto leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {t.emptyVaultDesc}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addAccountCta}</span>
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-black/20 backdrop-blur-xs border border-white/15 rounded-xl p-8 text-center text-sm text-white/80">
          {t.noSearchMatch}
        </div>
      ) : (
        <div className="divide-y divide-white/15">
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
                className="bg-transparent py-3.5 px-1 sm:px-2 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3 sm:gap-5">
                  {/* Left Side: Unboxed Avatar+Timer & Clean Text over wallpaper */}
                  <div className="min-w-0 flex-1 flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
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
                          className="w-14 inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg bg-black/25 border border-white/25 hover:bg-black/45 text-[11px] font-medium text-white transition-colors whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>+1</span>
                        </button>
                      )}
                    </div>

                    {/* Beside Image: Clean Drop-Shadowed Text over Wallpaper */}
                    <div className="min-w-0 flex-1 space-y-0.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.98)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
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
                                ? 'text-emerald-300'
                                : 'text-white/75 hover:text-white'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {openMenuId === acc.id && (
                            <div
                              role="menu"
                              className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-44 rounded-xl border border-white/20 bg-slate-950/95 backdrop-blur-md shadow-2xl py-1.5 z-40"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEditAccount(acc);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 text-left transition-colors whitespace-nowrap"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-white/60 shrink-0" />
                                <span>{t.editAccount}</span>
                              </button>

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setQrAccount(acc);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 text-left transition-colors whitespace-nowrap"
                              >
                                <QrCode className="w-3.5 h-3.5 text-white/60 shrink-0" />
                                <span>{t.showQr}</span>
                              </button>

                              <div className="my-1 border-t border-white/15" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setConfirmDeleteId(isConfirmingDelete ? null : acc.id);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/15 text-left transition-colors whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>{t.deleteAccount}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-white/95 truncate">
                        {acc.issuer}
                      </p>

                      {acc.accountName && acc.accountName.trim().toLowerCase() !== 'user' && (
                        <p className="text-xs text-white/85 truncate">
                          {acc.accountName}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[11px] sm:text-xs text-white/80 tabular-nums">
                        <span className="font-semibold text-white/90">
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
                        <p className="text-[11px] sm:text-xs text-white/80 truncate pt-0.5">
                          {acc.caption}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Pure Unboxed OTP Code & Clean Copy Button over Wallpaper */}
                  {(() => {
                    const [partA, partB] = splitOtpGroups(state.code);
                    const isExpiring = acc.type === 'totp' && state.remainingSeconds <= 5;
                    const digitTextClass = isExpiring ? 'text-amber-300' : 'text-emerald-300';

                    return (
                      <div className="self-center flex flex-col items-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(acc.id, state.code)}
                          title={t.copyCode}
                          className={`flex items-center justify-center gap-1 px-1 py-0.5 bg-transparent border-0 font-mono text-xl sm:text-2xl font-extrabold tracking-[0.12em] tabular-nums leading-none cursor-pointer select-all transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.98)] ${digitTextClass}`}
                        >
                          <span>{partA}</span>
                          {partB && (
                            <>
                              <span className="text-white/50 font-normal tracking-normal">·</span>
                              <span>{partB}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyCode(acc.id, state.code)}
                          title={t.copyCode}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-semibold tracking-wide transition-all duration-150 active:scale-[0.97] whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] ${
                            isCopied
                              ? 'border-emerald-400 bg-emerald-600/85 text-white'
                              : 'border-white/30 bg-black/20 hover:bg-emerald-600/80 hover:border-emerald-400 text-white'
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
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-red-950/75 backdrop-blur-xs border border-red-400/50 text-xs">
                    <span className="text-red-100">{t.deleteConfirmMsg}</span>
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
                        className="px-2.5 py-1 rounded border border-white/25 text-white hover:bg-white/10 transition-colors"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-slate-950/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-white">
                {t.qrModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setQrAccount(null)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <QrCodeCanvas value={buildOtpAuthUri(qrAccount)} size={200} />
              <div>
                <p className="text-sm font-semibold text-white">
                  {qrAccount.issuer}
                </p>
                {qrAccount.accountName &&
                  qrAccount.accountName.trim().toLowerCase() !== 'user' && (
                    <p className="text-xs text-white/70">
                      {qrAccount.accountName}
                    </p>
                  )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/15 font-mono text-[11px] text-white/75 break-all max-h-24 overflow-y-auto">
              {buildOtpAuthUri(qrAccount)}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleCopyUri(qrAccount)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                {copiedUri ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUri ? t.copied : t.copyUri}</span>
              </button>
              <button
                type="button"
                onClick={() => setQrAccount(null)}
                className="px-4 py-2 rounded-lg border border-white/20 text-xs font-medium text-white/90 hover:bg-white/10 transition-colors"
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
