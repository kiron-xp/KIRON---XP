import React, { useEffect, useState } from 'react';
import {
  Dices,
  Eye,
  EyeOff,
  ImagePlus,
  Save,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Translations } from '../lib/i18n';
import { generateRandomBase32, isValidBase32, normalizeBase32 } from '../lib/crypto/base32';
import { buildOtpAuthUri, generateHOTP, generateTOTP } from '../lib/crypto/otp';
import { resizeImageToDataUrl } from '../lib/storage';
import { AccountEntry, OtpAlgorithm, OtpDigits, OtpType, TotpPeriod } from '../types';
import { AccountAvatar } from './AccountAvatar';
import { CountdownRing } from './CountdownRing';
import { QrCodeCanvas } from './QrCodeCanvas';

const ACCOUNT_CATEGORIES = [
  'WHATSAPP',
  'FACEBOOK',
  'INSTAGRAM',
  'TELEGRAM',
  'IMO',
  'PERSONAL',
  'GOOGLE',
  'OTHER',
] as const;

interface AddAccountViewProps {
  t: Translations;
  editingAccount: AccountEntry | null;
  onSaveAccount: (account: Omit<AccountEntry, 'id' | 'createdAt'>, existingId?: string) => void;
  onCancelEdit: () => void;
}

export function AddAccountView({
  t,
  editingAccount,
  onSaveAccount,
  onCancelEdit,
}: AddAccountViewProps) {
  const [issuer, setIssuer] = useState('');
  const [category, setCategory] = useState<string>('WHATSAPP');
  const [caption, setCaption] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(true);
  const [type, setType] = useState<OtpType>('totp');
  const [algorithm, setAlgorithm] = useState<OtpAlgorithm>('SHA-1');
  const [digits, setDigits] = useState<OtpDigits>(6);
  const [period, setPeriod] = useState<TotpPeriod>(30);
  const [counter, setCounter] = useState<number>(0);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);

  const [errorMsg, setErrorMsg] = useState('');

  const [previewCode, setPreviewCode] = useState('------');
  const [previewRemaining, setPreviewRemaining] = useState(30);

  useEffect(() => {
    if (editingAccount) {
      setIssuer(editingAccount.issuer);
      setCategory(editingAccount.category || 'WHATSAPP');
      setCaption(editingAccount.caption || '');
      setSecret(editingAccount.secret);
      setType(editingAccount.type);
      setAlgorithm(editingAccount.algorithm);
      setDigits(editingAccount.digits);
      setPeriod(editingAccount.period);
      setCounter(editingAccount.counter);
      setAvatarDataUrl(editingAccount.avatarDataUrl);
      setErrorMsg('');
    } else {
      setIssuer('');
      setCategory('WHATSAPP');
      setCaption('');
      setSecret('');
      setType('totp');
      setAlgorithm('SHA-1');
      setDigits(6);
      setPeriod(30);
      setCounter(0);
      setAvatarDataUrl(undefined);
      setErrorMsg('');
    }
  }, [editingAccount]);

  useEffect(() => {
    let mounted = true;

    const updatePreview = async () => {
      if (!isValidBase32(secret)) {
        if (mounted) {
          setPreviewCode(digits === 8 ? '--------' : '------');
          setPreviewRemaining(period);
        }
        return;
      }

      try {
        if (type === 'totp') {
          const res = await generateTOTP(secret, algorithm, digits, period);
          if (mounted) {
            setPreviewCode(res.code);
            setPreviewRemaining(res.remainingSeconds);
          }
        } else {
          const code = await generateHOTP(secret, counter, algorithm, digits);
          if (mounted) {
            setPreviewCode(code);
          }
        }
      } catch {
        if (mounted) setPreviewCode(digits === 8 ? '--------' : '------');
      }
    };

    updatePreview();
    const timer = window.setInterval(updatePreview, 300);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [secret, type, algorithm, digits, period, counter]);

  const handleGenerateRandom = () => {
    setSecret(generateRandomBase32(20));
    setErrorMsg('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImageToDataUrl(file, 160);
      setAvatarDataUrl(resized);
    } catch {
      // Ignore invalid image
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!issuer.trim()) {
      setErrorMsg(t.validationIssuerRequired);
      return;
    }
    if (!isValidBase32(secret)) {
      setErrorMsg(t.validationSecretInvalid);
      return;
    }

    onSaveAccount(
      {
        issuer: issuer.trim(),
        accountName: editingAccount?.accountName || '',
        category,
        caption: caption.trim() || undefined,
        secret: normalizeBase32(secret),
        type,
        algorithm,
        digits,
        period,
        counter: Math.max(0, Math.floor(counter)),
        avatarDataUrl,
      },
      editingAccount?.id
    );
  };

  const previewUri = isValidBase32(secret)
    ? buildOtpAuthUri({
        issuer: issuer.trim() || 'Prohori',
        accountName: editingAccount?.accountName || 'account',
        secret: normalizeBase32(secret),
        type,
        algorithm,
        digits,
        period,
        counter,
      })
    : '';

  const formattedCode =
    previewCode.length === 8
      ? `${previewCode.slice(0, 4)} ${previewCode.slice(4)}`
      : previewCode.length === 6
      ? `${previewCode.slice(0, 3)} ${previewCode.slice(3)}`
      : previewCode;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {editingAccount ? t.editAccount : t.addTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.addSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Manual Entry Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
        >
          {/* Service Name & Caption */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.serviceNameLabel}
              </label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder={t.serviceNamePlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.captionLabel}
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t.captionPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Gallery Image Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t.galleryIconLabel}
            </label>
            <div className="flex items-center gap-4">
              <AccountAvatar issuer={issuer || 'Prohori'} avatarDataUrl={avatarDataUrl} size="lg" />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  <span>{t.uploadIconBtn}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                {avatarDataUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarDataUrl(undefined)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.removeIconBtn}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Base32 Secret Key + Random Generator */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.secretKeyLabel}
              </label>
              <button
                type="button"
                onClick={handleGenerateRandom}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>{t.generateRandomKey}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={t.secretKeyPlaceholder}
                className="w-full px-3.5 py-2.5 pr-10 font-mono text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Toggle secret visibility"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Category & OTP Type */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.categoryLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACCOUNT_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2 rounded-lg border text-center text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.otpTypeLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['totp', 'hotp'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setType(opt)}
                    className={`px-3.5 py-2.5 rounded-lg border text-center text-xs font-semibold tracking-wide transition-colors ${
                      type === opt
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Digits, Period/Counter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.digitsLabel}
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {([6, 8] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDigits(d)}
                    className={`py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                      digits === d
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {type === 'totp' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.periodLabel}
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value) as TotpPeriod)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600"
                >
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.initialCounterLabel}
                </label>
                <input
                  type="number"
                  min={0}
                  value={counter}
                  onChange={(e) => setCounter(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600"
                />
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{editingAccount ? t.updateAccountBtn : t.saveAccountBtn}</span>
            </button>

            {editingAccount && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t.cancel}
              </button>
            )}
          </div>
        </form>

        {/* Live Preview Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.livePreviewLabel}
          </div>

          <div className="flex items-start gap-3.5">
            <AccountAvatar issuer={issuer || 'Prohori'} avatarDataUrl={avatarDataUrl} />
            <div className="min-w-0 space-y-0.5">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                MD KIRON MONDAL
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {issuer.trim() || t.serviceNamePlaceholder.split(',')[0]}
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                {type.toUpperCase()} - {category}
              </div>
              {caption.trim() && (
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {caption.trim()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-3 border-y border-slate-100 dark:border-slate-800">
            <span className="font-mono text-3xl font-bold tracking-wider tabular-nums text-slate-900 dark:text-white">
              {formattedCode}
            </span>
            {type === 'totp' && isValidBase32(secret) && (
              <CountdownRing
                remainingSeconds={previewRemaining}
                period={period}
                secondsShort={t.secondsShort}
              />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {type.toUpperCase()} - {category}
            </span>
            <span aria-hidden="true">·</span>
            <span>{type === 'totp' ? `${period}${t.secondsShort}` : `${t.counterLabel}: ${counter}`}</span>
            <span aria-hidden="true">·</span>
            <span>
              {digits} {t.digitsUnit}
            </span>
          </div>

          {previewUri && (
            <div className="pt-2 flex flex-col items-center">
              <QrCodeCanvas value={previewUri} size={160} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
