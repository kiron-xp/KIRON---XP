import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { Translations } from '../lib/i18n';
import { RecoveryCode } from '../types';

interface SecurityBackupViewProps {
  t: Translations;
  recoveryCodes: RecoveryCode[];
  onRegenerateRecoveryCodes: () => void;
}

export function SecurityBackupView({
  t,
  recoveryCodes,
  onRegenerateRecoveryCodes,
}: SecurityBackupViewProps) {
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const remainingRecoveryCount = recoveryCodes.filter((c) => !c.used).length;

  const handleCopyRecoveryCodes = async () => {
    const text = recoveryCodes.map((c) => `${c.code}${c.used ? ` (${t.usedLabel})` : ''}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRecovery(true);
      window.setTimeout(() => setCopiedRecovery(false), 1600);
    } catch {
      // ignore
    }
  };

  const handleDownloadRecoveryTxt = () => {
    const text = [
      'KIRON - XP — Recovery Codes',
      '==========================================',
      ...recoveryCodes.map((c, idx) => `${idx + 1}. ${c.code} [${c.used ? 'USED' : 'ACTIVE'}]`),
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiron-xp-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* 8 One-Time Recovery Codes */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.recoverySectionTitle}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                {t.recoverySectionDesc}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300 shrink-0">
            {remainingRecoveryCount}/8 {t.recoveryRemaining}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recoveryCodes.map((rc) => (
            <div
              key={rc.id}
              className={`px-3.5 py-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                rc.used
                  ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span
                className={`font-mono text-xs font-semibold tabular-nums ${
                  rc.used
                    ? 'line-through text-slate-400 dark:text-slate-600'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {rc.code}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  rc.used
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {rc.used ? t.usedLabel : t.availableLabel}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopyRecoveryCodes}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            {copiedRecovery ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRecovery ? t.copied : t.copyAllCodes}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadRecoveryTxt}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.downloadCodes}</span>
          </button>

          {!confirmRegen ? (
            <button
              type="button"
              onClick={() => setConfirmRegen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.regenerateCodesBtn}</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs">
              <span className="text-amber-800 dark:text-amber-300">{t.regenerateCodesConfirm}</span>
              <button
                type="button"
                onClick={() => {
                  onRegenerateRecoveryCodes();
                  setConfirmRegen(false);
                }}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {t.regenerateCodesBtn}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRegen(false)}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {t.cancel}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
