import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  RotateCcw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Type,
} from 'lucide-react';
import { DEFAULT_SITE_ENTRY_CONFIG } from '../lib/firestoreVault';
import { compressImageForVault, sha256Hex, verifySiteEntryPassword } from '../lib/storage';
import { Language, SiteEntryConfig } from '../types';
import { SOCIAL_APPS, SocialAppLogoSvg } from './SocialAppIcons';

const DEFAULT_GATE_WALLPAPER_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_0000000063188246b2dc4e77b1130652_ad6f1a5e.webp`;
const OVERLAY_STEPS = [0, 10, 20, 25, 30, 40, 50, 60, 70, 80];

interface SiteSettingsViewProps {
  lang: Language;
  config: SiteEntryConfig;
  onSaveConfig: (next: SiteEntryConfig) => Promise<void>;
}

export function SiteSettingsView({ lang, config, onSaveConfig }: SiteSettingsViewProps) {
  const isBn = lang === 'bn';

  const [headerTitle, setHeaderTitle] = useState(config.headerTitle);
  const [lockTitle, setLockTitle] = useState(config.lockTitle);
  const [lockDesc, setLockDesc] = useState(config.lockDesc);
  const [unlockBtnText, setUnlockBtnText] = useState(config.unlockBtnText);
  const [bio, setBio] = useState(config.bio);
  const [telegramUrl, setTelegramUrl] = useState(config.telegramUrl ?? '');
  const [whatsappUrl, setWhatsappUrl] = useState(config.whatsappUrl ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(config.tiktokUrl ?? '');
  const [instagramUrl, setInstagramUrl] = useState(config.instagramUrl ?? '');
  const [wechatUrl, setWechatUrl] = useState(config.wechatUrl ?? '');
  const [facebookUrl, setFacebookUrl] = useState(config.facebookUrl ?? '');
  const [imoUrl, setImoUrl] = useState(config.imoUrl ?? '');
  const [messengerUrl, setMessengerUrl] = useState(config.messengerUrl ?? '');
  const [whatsappUrl2, setWhatsappUrl2] = useState(config.whatsappUrl2 ?? '');
  const [telegramUrl2, setTelegramUrl2] = useState(config.telegramUrl2 ?? '');
  const [showSocialLinks, setShowSocialLinks] = useState(config.showSocialLinks);
  const [showLogo, setShowLogo] = useState(config.showLogo);
  const [overlayOpacity, setOverlayOpacity] = useState(config.overlayOpacity);
  const [wallpaperDataUrl, setWallpaperDataUrl] = useState<string | undefined>(
    config.wallpaperDataUrl
  );

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsErr, setSettingsErr] = useState<string | null>(null);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeaderTitle(config.headerTitle);
    setLockTitle(config.lockTitle);
    setLockDesc(config.lockDesc);
    setUnlockBtnText(config.unlockBtnText);
    setBio(config.bio);
    setTelegramUrl(config.telegramUrl ?? '');
    setWhatsappUrl(config.whatsappUrl ?? '');
    setTiktokUrl(config.tiktokUrl ?? '');
    setInstagramUrl(config.instagramUrl ?? '');
    setWechatUrl(config.wechatUrl ?? '');
    setFacebookUrl(config.facebookUrl ?? '');
    setImoUrl(config.imoUrl ?? '');
    setMessengerUrl(config.messengerUrl ?? '');
    setWhatsappUrl2(config.whatsappUrl2 ?? '');
    setTelegramUrl2(config.telegramUrl2 ?? '');
    setShowSocialLinks(config.showSocialLinks);
    setShowLogo(config.showLogo);
    setOverlayOpacity(config.overlayOpacity);
    setWallpaperDataUrl(config.wallpaperDataUrl);
  }, [config]);

  const buildDraftConfig = (overrideHash?: string): SiteEntryConfig => ({
    ...config,
    headerTitle: headerTitle.trim() || DEFAULT_SITE_ENTRY_CONFIG.headerTitle,
    lockTitle,
    lockDesc,
    unlockBtnText,
    bio,
    telegramUrl: telegramUrl.trim(),
    whatsappUrl: whatsappUrl.trim(),
    tiktokUrl: tiktokUrl.trim(),
    instagramUrl: instagramUrl.trim(),
    wechatUrl: wechatUrl.trim(),
    facebookUrl: facebookUrl.trim(),
    imoUrl: imoUrl.trim(),
    messengerUrl: messengerUrl.trim(),
    whatsappUrl2: whatsappUrl2.trim(),
    telegramUrl2: telegramUrl2.trim(),
    showSocialLinks,
    showLogo,
    overlayOpacity,
    wallpaperDataUrl,
    entryPasswordHash: overrideHash !== undefined ? overrideHash : config.entryPasswordHash,
    updatedAt: Date.now(),
  });

  const handleSaveEntrySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsErr(null);
    setSettingsMsg(null);
    setSavingSettings(true);
    try {
      await onSaveConfig(buildDraftConfig());
      setSettingsMsg(
        isBn
          ? 'প্রবেশ পেজের সব পরিবর্তন সফলভাবে সংরক্ষিত ও লাইভ হয়েছে।'
          : 'All entry page changes saved and published live.'
      );
    } catch {
      setSettingsErr(
        isBn ? 'সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Failed to save changes.'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangeEntryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr(null);
    setPassMsg(null);

    if (!currentPass.trim()) {
      setPassErr(isBn ? 'বর্তমান পাসওয়ার্ড লিখুন।' : 'Enter current password.');
      return;
    }

    const cleanNew = newPass.trim();
    if (cleanNew.length < 3) {
      setPassErr(
        isBn ? 'নতুন পাসওয়ার্ড কমপক্ষে ৩ অক্ষরের হতে হবে।' : 'New password must be at least 3 chars.'
      );
      return;
    }

    if (cleanNew !== confirmPass.trim()) {
      setPassErr(isBn ? 'নতুন পাসওয়ার্ড দুটি মিলছে না।' : 'New passwords do not match.');
      return;
    }

    setSavingPass(true);
    try {
      const valid = await verifySiteEntryPassword(currentPass, config.entryPasswordHash);
      if (!valid) {
        setPassErr(isBn ? 'বর্তমান পাসওয়ার্ড সঠিক নয়।' : 'Current password is incorrect.');
        return;
      }

      const nextHash = await sha256Hex(cleanNew);
      localStorage.setItem('kiron_site_pass_hash_v2', nextHash);
      await onSaveConfig(buildDraftConfig(nextHash));

      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setPassMsg(
        isBn
          ? 'প্রবেশ পাসওয়ার্ড সফলভাবে পরিবর্তন ও লাইভ হয়েছে।'
          : 'Entry password updated and synced live.'
      );
    } catch {
      setPassErr(isBn ? 'পাসওয়ার্ড পরিবর্তন করা যায়নি।' : 'Could not update entry password.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleWallpaperPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSettingsErr(null);
    try {
      const compressed = await compressImageForVault(file, 1600, 680000);
      setWallpaperDataUrl(compressed);
    } catch {
      setSettingsErr(
        isBn ? 'ওয়েলপেপার ছবি লোড করা যায়নি।' : 'Could not process selected wallpaper image.'
      );
    }
  };

  const handleResetVisuals = async () => {
    setHeaderTitle(DEFAULT_SITE_ENTRY_CONFIG.headerTitle);
    setLockTitle(DEFAULT_SITE_ENTRY_CONFIG.lockTitle);
    setLockDesc(DEFAULT_SITE_ENTRY_CONFIG.lockDesc);
    setUnlockBtnText(DEFAULT_SITE_ENTRY_CONFIG.unlockBtnText);
    setShowLogo(true);
    setShowSocialLinks(true);
    setOverlayOpacity(25);
    setWallpaperDataUrl(undefined);
    setSettingsMsg(null);
    setSettingsErr(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
            <SlidersHorizontal className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{isBn ? 'KIRON — প্রবেশ পথ ও সাইট সেটিংস' : 'KIRON — Entry Gate Settings'}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {isBn
              ? 'ওয়েবসাইটে ঢোকার পাসওয়ার্ড, বায়ো, টেলিগ্রাম, হোয়াটসঅ্যাপ, ওয়েলপেপার এবং সব লেখা এখান থেকে পরিবর্তন করুন।'
              : 'Customize entry password, bio, Telegram, WhatsApp, wallpaper, logo visibility, and entry screen texts.'}
          </p>
        </div>
      </div>

      {/* 1. Entry Password Change */}
      <form
        onSubmit={handleChangeEntryPassword}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isBn ? 'প্রবেশ পাসওয়ার্ড পরিবর্তন' : 'Change Entry Password'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? 'সাইটে ঢোকার পাসওয়ার্ড এখান থেকে বদলালে সবাই নতুন পাসওয়ার্ড দিয়ে ঢুকবে।'
                : 'Updating the entry password applies across all visitors immediately.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isBn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPass}
                onChange={(e) => {
                  setCurrentPass(e.target.value);
                  if (passErr) setPassErr(null);
                }}
                autoComplete="off"
                placeholder={isBn ? 'বর্তমান পাসওয়ার্ড' : 'Current password'}
                className="w-full px-3 py-2 pr-9 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Toggle current password"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isBn ? 'নতুন পাসওয়ার্ড' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  if (passErr) setPassErr(null);
                }}
                autoComplete="off"
                placeholder={isBn ? 'নতুন পাসওয়ার্ড' : 'New password'}
                className="w-full px-3 py-2 pr-9 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowNewPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Toggle new password"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isBn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
            </label>
            <input
              type={showNewPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={(e) => {
                setConfirmPass(e.target.value);
                if (passErr) setPassErr(null);
              }}
              autoComplete="off"
              placeholder={isBn ? 'আবার লিখুন' : 'Repeat new password'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>
        </div>

        {passErr && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{passErr}</span>
          </div>
        )}

        {passMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passMsg}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPass}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{savingPass ? '...' : isBn ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Entry Password'}</span>
          </button>
        </div>
      </form>

      {/* 2. Bio, Telegram/WhatsApp, Texts, Logo & Wallpaper */}
      <form onSubmit={handleSaveEntrySettings} className="space-y-6">
        {/* Bio & Social Links */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isBn ? 'বায়ো এবং ১০টি অ্যাপ লিংক / আইডি' : 'Entry Bio & Social App Links'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? '২টি WhatsApp, ২টি Telegram, TikTok, Instagram, WeChat, Facebook, imo এবং Messenger এর আইডি/নম্বর যোগ করুন।'
                  : 'Add your numbers, IDs, or links for all 10 apps shown in the 5×2 launcher.'}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {isBn ? 'বায়ো (নিচে দেখাবে)' : 'Bio Text (Bottom)'}
              </label>
              <span className="text-[11px] text-slate-400">{bio.length}/300</span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={
                isBn
                  ? 'আপনার সম্পর্কে বা সাইটের বায়ো এখানে লিখুন...'
                  : 'Write a short bio displayed at the bottom of the entry page...'
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SOCIAL_APPS.map((app) => {
              const valueMap = {
                whatsappUrl,
                telegramUrl,
                tiktokUrl,
                instagramUrl,
                wechatUrl,
                facebookUrl,
                imoUrl,
                messengerUrl,
                whatsappUrl2,
                telegramUrl2,
              };
              const setterMap = {
                whatsappUrl: setWhatsappUrl,
                telegramUrl: setTelegramUrl,
                tiktokUrl: setTiktokUrl,
                instagramUrl: setInstagramUrl,
                wechatUrl: setWechatUrl,
                facebookUrl: setFacebookUrl,
                imoUrl: setImoUrl,
                messengerUrl: setMessengerUrl,
                whatsappUrl2: setWhatsappUrl2,
                telegramUrl2: setTelegramUrl2,
              };
              return (
                <div key={app.id}>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span
                      className={`relative w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${app.badgeClass}`}
                    >
                      <SocialAppLogoSvg id={app.id} className="w-3.5 h-3.5" />
                    </span>
                    <span>{app.settingsLabel}</span>
                  </label>
                  <input
                    type="text"
                    value={valueMap[app.configKey]}
                    onChange={(e) => setterMap[app.configKey](e.target.value)}
                    placeholder={isBn ? app.placeholderBn : app.placeholderEn}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                  />
                </div>
              );
            })}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={showSocialLinks}
              onChange={(e) => setShowSocialLinks(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isBn
                ? 'প্রবেশ পেজে ৫×২ লাইনে ১০টি অ্যাপ লোগো দেখান'
                : 'Show all 10 app icons in a 5×2 grid on the entry page'}
            </span>
          </label>
        </div>

        {/* Texts & Logo */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isBn ? 'প্রবেশ পেজের সব লেখা ও লোগো' : 'Entry Texts & Center Logo'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'শিরোনাম, উপ-শিরোনাম, বাটনের লেখা এবং মাঝখানের খরগোশ লোগো নিয়ন্ত্রণ করুন।'
                  : 'Edit titles, prompt subtitle, unlock button label, and center logo visibility.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'উপরের ব্র্যান্ড নাম' : 'Top Header Brand'}
              </label>
              <input
                type="text"
                maxLength={80}
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'মূল শিরোনাম' : 'Main Title'}
              </label>
              <input
                type="text"
                maxLength={120}
                value={lockTitle}
                onChange={(e) => setLockTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'উপ-শিরোনাম' : 'Subtitle Text'}
              </label>
              <input
                type="text"
                maxLength={240}
                value={lockDesc}
                onChange={(e) => setLockDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'প্রবেশ লেখার টেক্সট' : 'Unlock Button Text'}
              </label>
              <input
                type="text"
                maxLength={60}
                value={unlockBtnText}
                onChange={(e) => setUnlockBtnText(e.target.value)}
                placeholder={isBn ? 'প্রবেশ করুন' : 'Enter'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={showLogo}
              onChange={(e) => setShowLogo(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {isBn ? 'পাসওয়ার্ডের উপরে খরগোশ লোগো দেখান' : 'Show center rabbit logo above title'}
            </span>
          </label>
        </div>

        {/* Wallpaper & Darkness */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/70 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <ImagePlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isBn ? 'প্রবেশ পেজের ওয়েলপেপার' : 'Entry Screen Wallpaper'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'গ্যালারি থেকে নতুন ওয়েলপেপার ছবি দিন অথবা ডিফল্ট ওয়েলপেপার ব্যবহার করুন।'
                    : 'Upload a custom wallpaper image or reset to default.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-28 h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black shrink-0 shadow-sm">
              <img
                src={wallpaperDataUrl || DEFAULT_GATE_WALLPAPER_URL}
                alt="Wallpaper Preview"
                className="w-full h-full object-cover object-center"
              />
            </div>

            <div className="flex-1 space-y-3 w-full">
              <input
                ref={wallpaperInputRef}
                type="file"
                accept="image/*"
                onChange={handleWallpaperPick}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <ImagePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'গ্যালারি থেকে ওয়েলপেপার দিন' : 'Choose Wallpaper'}</span>
                </button>

                {wallpaperDataUrl && (
                  <button
                    type="button"
                    onClick={() => setWallpaperDataUrl(undefined)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isBn ? 'আগের ওয়েলপেপারে ফিরুন' : 'Use Default Wallpaper'}</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {isBn
                    ? `ওয়েলপেপার ডার্কনেস (${overlayOpacity}%)`
                    : `Wallpaper Dimming (${overlayOpacity}%)`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OVERLAY_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setOverlayOpacity(step)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        overlayOpacity === step
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {settingsErr && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{settingsErr}</span>
          </div>
        )}

        {settingsMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{settingsMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetVisuals}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'লেখা ও ছবি ডিফল্ট করুন' : 'Reset Texts & Theme'}</span>
          </button>

          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>
              {savingSettings
                ? '...'
                : isBn
                  ? 'সব পরিবর্তন সেভ ও লাইভ করুন'
                  : 'Save & Publish Changes'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
