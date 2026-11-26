import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  FilePlus,
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  MailPlus,
  Menu,
  Moon,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  StickyNote,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import { AddAccountView } from './components/AddAccountView';
import { EmailVaultView } from './components/EmailVaultView';
import { LockScreen } from './components/LockScreen';
import { NotesDiaryView } from './components/NotesDiaryView';
import { SecurityBackupView } from './components/SecurityBackupView';
import { SiteSettingsView } from './components/SiteSettingsView';
import { VaultView } from './components/VaultView';
import {
  deleteAccountDoc,
  deleteEmailDoc,
  deleteNoteDoc,
  deleteProfileMediaDoc,
  loadCachedSiteEntryConfig,
  migrateLocalDataToFirestoreOnce,
  sanitizeDocId,
  saveProfileMediaDoc,
  saveSiteEntryConfig,
  subscribeToSharedVault,
  subscribeToSiteEntryConfig,
  updateProfileMediaDoc,
  upsertAccountDoc,
  upsertEmailDoc,
  upsertNoteDoc,
} from './lib/firestoreVault';
import { getTranslations } from './lib/i18n';
import {
  compressImageForVault,
  createInitialVault,
  ensureMainProfileSeeded,
  loadLanguagePreference,
  loadStoredVaultRecord,
  loadThemePreference,
  resetEntireVault,
  saveLanguagePreference,
  savePasswordProfileVault,
  saveThemePreference,
  saveVaultData,
  unlockVaultWithPassphrase,
  verifySiteEntryPassword,
} from './lib/storage';
import {
  AccountEntry,
  ActiveTab,
  EmailEntry,
  Language,
  NoteEntry,
  ProfileMediaEntry,
  SiteEntryConfig,
  ThemeMode,
  VaultData,
} from './types';

const APP_LOGO_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_000000002b0482468abe72240ce92705_43f8ec1c.webp`;
const DEFAULT_WALLPAPER_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_0000000063188246b2dc4e77b1130652_ad6f1a5e.webp`;

const INSIDE_OVERLAY_CLASS_MAP: Record<number, string> = {
  0: 'bg-black/0',
  10: 'bg-black/10',
  20: 'bg-black/20',
  30: 'bg-black/30',
  35: 'bg-black/35',
  45: 'bg-black/45',
  60: 'bg-black/60',
  75: 'bg-black/75',
};

function getInsideOverlayClass(opacity?: number): string {
  const steps = [0, 10, 20, 30, 35, 45, 60, 75];
  const val = typeof opacity === 'number' && Number.isFinite(opacity) ? opacity : 30;
  let closest = 30;
  let minDiff = Infinity;
  for (const step of steps) {
    const diff = Math.abs(step - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = step;
    }
  }
  return INSIDE_OVERLAY_CLASS_MAP[closest] ?? 'bg-black/30';
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => loadLanguagePreference());
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference());

  const [siteUnlocked, setSiteUnlocked] = useState<boolean>(() => {
    sessionStorage.removeItem('kiron_site_unlocked');
    return sessionStorage.getItem('kiron_site_unlocked_v2') === '1';
  });

  const initialRecord = loadStoredVaultRecord();
  const [isEncrypted, setIsEncrypted] = useState<boolean>(initialRecord.encrypted);
  const [isLocked, setIsLocked] = useState<boolean>(initialRecord.encrypted);
  const [activePassphrase, setActivePassphrase] = useState<string | null>(null);
  const [vault, setVault] = useState<VaultData>(() =>
    initialRecord.encrypted
      ? createInitialVault()
      : initialRecord.data ?? createInitialVault()
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('vault');
  const [emailAddNonce, setEmailAddNonce] = useState(0);
  const [noteAddNonce, setNoteAddNonce] = useState(0);
  const [mediaAddNonce, setMediaAddNonce] = useState(0);
  const [editingAccount, setEditingAccount] = useState<AccountEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sadiyaModalOpen, setSadiyaModalOpen] = useState(false);
  const [savingInsideWallpaper, setSavingInsideWallpaper] = useState(false);
  const sadiyaFileInputRef = useRef<HTMLInputElement>(null);
  const [siteConfig, setSiteConfig] = useState<SiteEntryConfig>(() => loadCachedSiteEntryConfig());
  const [activeProfile, setActiveProfile] = useState<{ name: string; password: string } | null>(null);
  const vaultRef = useRef<VaultData>(vault);
  vaultRef.current = vault;

  const t = getTranslations(lang);

  useEffect(() => {
    const unsubscribe = subscribeToSiteEntryConfig((next) => {
      setSiteConfig(next);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    const initMainProfile = async () => {
      if (initialRecord.encrypted) return;
      sessionStorage.removeItem('prohori_logged_out');
      const seeded = await ensureMainProfileSeeded();
      if (!active) return;
      if (seeded) {
        setActiveProfile({ name: seeded.name, password: seeded.password });
        setVault((prev) => ({
          ...seeded.data,
          accounts: prev.accounts.length > 0 ? prev.accounts : seeded.data.accounts,
          emails: (prev.emails?.length ?? 0) > 0 ? prev.emails : seeded.data.emails,
          notes: (prev.notes?.length ?? 0) > 0 ? prev.notes : seeded.data.notes,
          sheets: (prev.sheets?.length ?? 0) > 0 ? prev.sheets : seeded.data.sheets,
        }));
        void migrateLocalDataToFirestoreOnce(seeded.data);
      } else if (initialRecord.data) {
        void migrateLocalDataToFirestoreOnce(initialRecord.data);
      }
    };
    initMainProfile();
    return () => {
      active = false;
    };
  }, [initialRecord.encrypted]);

  useEffect(() => {
    if (!siteUnlocked || isLocked) return;

    const unsubscribe = subscribeToSharedVault({
      onAccounts: (accounts) => {
        setVault((prev) => ({ ...prev, accounts: dedupeById(accounts), updatedAt: Date.now() }));
      },
      onEmails: (emails) => {
        setVault((prev) => ({ ...prev, emails: dedupeById(emails), updatedAt: Date.now() }));
      },
      onNotes: (notes) => {
        setVault((prev) => ({ ...prev, notes: dedupeById(notes), updatedAt: Date.now() }));
      },
      onSheets: (sheets) => {
        setVault((prev) => ({ ...prev, sheets: dedupeById(sheets), updatedAt: Date.now() }));
      },
      onRecoveryCodes: (recoveryCodes) => {
        setVault((prev) => ({
          ...prev,
          recoveryCodes: dedupeById(recoveryCodes),
          updatedAt: Date.now(),
        }));
      },
      onProfileMedia: (profileMedia) => {
        setVault((prev) => ({
          ...prev,
          profileMedia: dedupeById(profileMedia),
          updatedAt: Date.now(),
        }));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [siteUnlocked, isLocked]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setSadiyaModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = lang;
    saveThemePreference(theme);
  }, [theme, lang]);

  useEffect(() => {
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    let ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement('meta');
      ogUrlMeta.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrlMeta);
    }
    ogUrlMeta.content = canonicalUrl;
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const toggleLang = () => {
    const next: Language = lang === 'bn' ? 'en' : 'bn';
    setLang(next);
    saveLanguagePreference(next);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const persistVault = async (nextVault: VaultData, pass: string | null = activePassphrase) => {
    setVault(nextVault);
    const { profileMedia: _omittedMedia, ...localVaultPayload } = nextVault;
    void _omittedMedia;
    if (activeProfile) {
      await savePasswordProfileVault(activeProfile.name, activeProfile.password, localVaultPayload);
    } else {
      await saveVaultData(localVaultPayload, pass);
    }
  };

  const handleUnlock = async (passphrase: string): Promise<boolean> => {
    try {
      const decrypted = await unlockVaultWithPassphrase(passphrase);
      setVault(decrypted);
      setActivePassphrase(passphrase);
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  };

  const handleLockNow = () => {
    if (!isEncrypted) return;
    setActivePassphrase(null);
    setVault(createInitialVault());
    setIsLocked(true);
  };

  const handleResetVault = () => {
    const fresh = resetEntireVault();
    setVault(fresh);
    setActivePassphrase(null);
    setIsEncrypted(false);
    setIsLocked(false);
    setActiveTab('vault');
  };

  const handleSaveAccount = async (
    data: Omit<AccountEntry, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    const current = vaultRef.current;
    let savedEntry: AccountEntry;
    let nextAccounts: AccountEntry[];

    if (existingId) {
      const existing = current.accounts.find((a) => a.id === existingId);
      savedEntry = {
        ...data,
        id: existingId,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      nextAccounts = current.accounts.map((acc) =>
        acc.id === existingId ? savedEntry : acc
      );
    } else {
      const rawId = crypto.randomUUID ? crypto.randomUUID() : `acc-${Date.now()}`;
      savedEntry = {
        ...data,
        id: sanitizeDocId(rawId),
        createdAt: Date.now(),
      };
      nextAccounts = dedupeById([savedEntry, ...current.accounts]);
    }

    await persistVault({ ...current, accounts: nextAccounts });
    setEditingAccount(null);
    setActiveTab('vault');
    showToast(t.accountSavedToast);
    try {
      await upsertAccountDoc(savedEntry);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const current = vaultRef.current;
    const nextAccounts = current.accounts.filter((a) => a.id !== id);
    await persistVault({ ...current, accounts: nextAccounts });
    try {
      await deleteAccountDoc(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIncrementHotp = async (id: string) => {
    const current = vaultRef.current;
    const target = current.accounts.find((a) => a.id === id);
    if (!target) return;
    const updatedAcc: AccountEntry = { ...target, counter: target.counter + 1 };
    const nextAccounts = current.accounts.map((a) => (a.id === id ? updatedAcc : a));
    await persistVault({ ...current, accounts: nextAccounts });
    try {
      await upsertAccountDoc(updatedAcc);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNote = async (
    data: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const current = vaultRef.current;
    const now = Date.now();
    const rawId = crypto.randomUUID ? crypto.randomUUID() : `note-${now}`;
    const newNote: NoteEntry = {
      ...data,
      id: sanitizeDocId(rawId),
      createdAt: now,
      updatedAt: now,
    };
    const currentNotes = current.notes ?? [];
    await persistVault({ ...current, notes: dedupeById([newNote, ...currentNotes]) });
    showToast(t.noteSavedToast);
    try {
      await upsertNoteDoc(newNote);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateNote = async (
    id: string,
    patch: Partial<Omit<NoteEntry, 'id' | 'createdAt'>>
  ) => {
    const current = vaultRef.current;
    const currentNotes = current.notes ?? [];
    const target = currentNotes.find((n) => n.id === id);
    if (!target) return;
    const updatedNote: NoteEntry = {
      ...target,
      ...patch,
      updatedAt: Date.now(),
    };
    const nextNotes = currentNotes.map((n) => (n.id === id ? updatedNote : n));
    await persistVault({ ...current, notes: nextNotes });
    try {
      await upsertNoteDoc(updatedNote);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const current = vaultRef.current;
    const currentNotes = current.notes ?? [];
    const nextNotes = currentNotes.filter((n) => n.id !== id);
    await persistVault({ ...current, notes: nextNotes });
    try {
      await deleteNoteDoc(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateEmail = async (
    data: Omit<EmailEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const current = vaultRef.current;
    const now = Date.now();
    const rawId = crypto.randomUUID ? crypto.randomUUID() : `email-${now}`;
    const newEntry: EmailEntry = {
      ...data,
      id: sanitizeDocId(rawId),
      createdAt: now,
      updatedAt: now,
    };
    const currentEmails = current.emails ?? [];
    await persistVault({ ...current, emails: dedupeById([newEntry, ...currentEmails]) });
    showToast(t.emailSavedToast);
    try {
      await upsertEmailDoc(newEntry);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEmail = async (
    id: string,
    patch: Partial<Omit<EmailEntry, 'id' | 'createdAt'>>
  ) => {
    const current = vaultRef.current;
    const currentEmails = current.emails ?? [];
    const target = currentEmails.find((item) => item.id === id);
    if (!target) return;
    const updatedEmail: EmailEntry = {
      ...target,
      ...patch,
      updatedAt: Date.now(),
    };
    const nextEmails = currentEmails.map((item) => (item.id === id ? updatedEmail : item));
    await persistVault({ ...current, emails: nextEmails });
    showToast(t.emailSavedToast);
    try {
      await upsertEmailDoc(updatedEmail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    const current = vaultRef.current;
    const currentEmails = current.emails ?? [];
    const nextEmails = currentEmails.filter((item) => item.id !== id);
    await persistVault({ ...current, emails: nextEmails });
    try {
      await deleteEmailDoc(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProfileMedia = async (
    entry: ProfileMediaEntry,
    onProgress?: (pct: number) => void
  ) => {
    const saved = await saveProfileMediaDoc(entry, onProgress);
    setVault((prev) => ({
      ...prev,
      profileMedia: dedupeById([saved, ...(prev.profileMedia ?? [])]),
      updatedAt: Date.now(),
    }));
    showToast(t.mediaSavedToast);
  };

  const handleUpdateProfileMedia = async (
    entry: ProfileMediaEntry,
    options?: { newFilePicked?: boolean; onProgress?: (pct: number) => void }
  ) => {
    const saved = await updateProfileMediaDoc(entry, options);
    setVault((prev) => ({
      ...prev,
      profileMedia: (prev.profileMedia ?? []).map((item) =>
        item.id === saved.id ? saved : item
      ),
      updatedAt: Date.now(),
    }));
    showToast(t.mediaSavedToast);
  };

  const handleDeleteProfileMedia = async (id: string) => {
    setVault((prev) => ({
      ...prev,
      profileMedia: (prev.profileMedia ?? []).filter((item) => item.id !== id),
      updatedAt: Date.now(),
    }));
    try {
      await deleteProfileMediaDoc(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSiteUnlock = async (password: string): Promise<boolean> => {
    const valid = await verifySiteEntryPassword(password, siteConfig.entryPasswordHash);
    if (valid) {
      sessionStorage.setItem('kiron_site_unlocked_v2', '1');
      setSiteUnlocked(true);
      return true;
    }
    return false;
  };

  const handleSaveSiteConfig = async (next: SiteEntryConfig) => {
    const saved = await saveSiteEntryConfig(next);
    setSiteConfig(saved);
  };

  const handleInsideWallpaperPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSavingInsideWallpaper(true);
    try {
      const compressed = await compressImageForVault(file, 1600, 680000);
      await handleSaveSiteConfig({
        ...siteConfig,
        insideWallpaperDataUrl: compressed,
        updatedAt: Date.now(),
      });
      showToast(
        lang === 'bn'
          ? 'ভিতরের ওয়েলপেপার পরিবর্তন ও সেভ হয়েছে।'
          : 'Website wallpaper updated and saved.'
      );
      setSadiyaModalOpen(false);
    } catch {
      showToast(t.importErrorToast);
    } finally {
      setSavingInsideWallpaper(false);
    }
  };

  const handleInsideOverlayStep = async (step: number) => {
    setSavingInsideWallpaper(true);
    try {
      await handleSaveSiteConfig({
        ...siteConfig,
        insideOverlayOpacity: step,
        updatedAt: Date.now(),
      });
    } catch {
      showToast(t.importErrorToast);
    } finally {
      setSavingInsideWallpaper(false);
    }
  };

  const handleResetInsideWallpaper = async () => {
    setSavingInsideWallpaper(true);
    try {
      await handleSaveSiteConfig({
        ...siteConfig,
        insideWallpaperDataUrl: undefined,
        updatedAt: Date.now(),
      });
      showToast(
        lang === 'bn'
          ? 'লক স্ক্রিনের ওয়েলপেপারে ফেরত নেওয়া হয়েছে।'
          : 'Restored lock screen wallpaper.'
      );
    } catch {
      showToast(t.importErrorToast);
    } finally {
      setSavingInsideWallpaper(false);
    }
  };

  if (!siteUnlocked) {
    return (
      <LockScreen
        t={t}
        lang={lang}
        theme={theme}
        isSiteGate
        siteConfig={siteConfig}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        onUnlock={handleSiteUnlock}
      />
    );
  }

  if (isLocked) {
    return (
      <LockScreen
        t={t}
        lang={lang}
        theme={theme}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        onUnlock={handleUnlock}
        onResetVault={handleResetVault}
      />
    );
  }

  const navItems: Array<{ id: ActiveTab; label: string; icon: typeof ShieldCheck }> = [
    { id: 'vault', label: t.navVault, icon: ShieldCheck },
    { id: 'email', label: t.navEmail, icon: Mail },
    { id: 'verify', label: t.navVerify, icon: StickyNote },
    { id: 'security', label: t.navSecurity, icon: UserCheck },
  ];

  const dropdownItems: Array<{
    key: string;
    id: ActiveTab;
    label: string;
    icon: typeof ShieldCheck;
    isAddEmail?: boolean;
    isAddNote?: boolean;
    isAddMedia?: boolean;
  }> = [
    { key: 'add', id: 'add', label: t.navAdd, icon: Plus },
    { key: 'add-email', id: 'email', label: t.menuAddEmail, icon: MailPlus, isAddEmail: true },
    { key: 'add-note', id: 'verify', label: t.menuAddNote, icon: FilePlus, isAddNote: true },
    { key: 'add-media', id: 'security', label: t.menuAddMedia, icon: ImagePlus, isAddMedia: true },
    { key: 'site-settings', id: 'site-settings', label: t.menuSiteSettings, icon: SlidersHorizontal },
  ];

  const insideWallpaperSrc =
    siteConfig.insideWallpaperDataUrl || siteConfig.wallpaperDataUrl || DEFAULT_WALLPAPER_URL;
  const insideOverlayClass = getInsideOverlayClass(siteConfig.insideOverlayOpacity);
  const showInsideWallpaper = activeTab !== 'security' && activeTab !== 'verify';

  return (
    <div
      className={`min-h-screen flex relative transition-colors ${
        showInsideWallpaper
          ? 'bg-black text-white'
          : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* Fullscreen Wallpaper inside unlocked website (hidden in PROFILE and KIRON Notes tabs) */}
      {showInsideWallpaper && (
        <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <img
            src={insideWallpaperSrc}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center"
          />
          <div className={`absolute inset-0 ${insideOverlayClass}`} />
        </div>
      )}

      {/* Full-Height Left Vertical Drawer (triggered by Hamburger Menu ☰) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="relative z-10 w-72 max-w-[82vw] h-full flex flex-col border-r border-white/15 bg-slate-950/90 backdrop-blur-md text-white shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/15 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={APP_LOGO_URL}
                  alt="KIRON - XP"
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                />
                <span className="text-base font-bold tracking-tight whitespace-nowrap text-white">
                  KIRON - XP
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t.close}
                className="p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vertical Navigation Stack */}
            <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5" aria-label="Primary Navigation">
              {dropdownItems.map((item) => {
                const Icon = item.icon;
                const active =
                  !item.isAddEmail && !item.isAddNote && !item.isAddMedia && activeTab === item.id;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.id !== 'add') setEditingAccount(null);
                      setActiveTab(item.id);
                      if (item.isAddEmail) {
                        setEmailAddNonce((n) => n + 1);
                      } else {
                        setEmailAddNonce(0);
                      }
                      if (item.isAddNote) {
                        setNoteAddNonce((n) => n + 1);
                      } else {
                        setNoteAddNonce(0);
                      }
                      if (item.isAddMedia) {
                        setMediaAddNonce((n) => n + 1);
                      } else {
                        setMediaAddNonce(0);
                      }
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-emerald-400' : 'text-white/65'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {active && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer: Status, Lock, Language & Theme Switches */}
            <div className="p-4 border-t border-white/15 space-y-3 shrink-0">
              <div className="text-xs text-white/70 flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-2 min-w-0">
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${isEncrypted ? 'text-emerald-400' : 'text-white/60'}`} />
                  <span className="truncate font-medium">
                    {isEncrypted ? t.vaultEncryptedStatus : t.vaultUnencryptedStatus}
                  </span>
                </span>
                {isEncrypted && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      handleLockNow();
                    }}
                    className="text-xs font-medium text-emerald-400 hover:underline shrink-0"
                  >
                    {t.lockVault}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 text-xs font-medium text-white transition-colors whitespace-nowrap"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 text-xs font-medium text-white transition-colors whitespace-nowrap"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Bar: Transparent over wallpaper tabs, crisp theme-aware bar on PROFILE & KIRON Notes */}
        <header
          className={`h-14 sm:h-16 px-4 sm:px-8 flex items-center gap-3 sticky top-0 z-30 transition-colors ${
            showInsideWallpaper
              ? 'border-b border-transparent bg-transparent'
              : 'border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm'
          }`}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-label="Menu"
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shrink-0 ${
              showInsideWallpaper
                ? 'border-white/25 bg-black/25 backdrop-blur-xs hover:bg-black/45 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={APP_LOGO_URL}
              alt="KIRON - XP"
              className="w-8 h-8 rounded-xl object-cover object-center shrink-0 shadow-sm"
            />
            <span
              className={`text-base font-bold tracking-tight whitespace-nowrap ${
                showInsideWallpaper
                  ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              KIRON - XP
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 mx-auto" aria-label="Desktop Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id !== 'add') setEditingAccount(null);
                    setEmailAddNonce(0);
                    setNoteAddNonce(0);
                    setMediaAddNonce(0);
                    setActiveTab(item.id);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    showInsideWallpaper
                      ? `drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)] ${
                          active
                            ? 'bg-black/35 border border-white/30 text-emerald-300 backdrop-blur-xs'
                            : 'text-white/85 hover:bg-black/25 hover:text-white'
                        }`
                      : active
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* SADIYA name aligned straight to the right across from KIRON - XP — touch to change inside wallpaper */}
          <button
            type="button"
            onClick={() => setSadiyaModalOpen(true)}
            aria-label="SADIYA Wallpaper"
            title={lang === 'bn' ? 'ওয়ালপেপার পরিবর্তন করুন' : 'Change Website Wallpaper'}
            className={`ml-auto md:ml-0 inline-flex items-center px-2.5 py-1 rounded-lg bg-transparent text-sm font-bold tracking-wide transition-colors shrink-0 cursor-pointer ${
              showInsideWallpaper
                ? 'hover:bg-black/25 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100'
            }`}
          >
            <span>SADIYA</span>
          </button>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'vault' && (
            <VaultView
              t={t}
              accounts={vault.accounts}
              onNavigateAdd={() => {
                setEditingAccount(null);
                setActiveTab('add');
              }}
              onEditAccount={(acc) => {
                setEditingAccount(acc);
                setActiveTab('add');
              }}
              onDeleteAccount={handleDeleteAccount}
              onIncrementHotp={handleIncrementHotp}
            />
          )}

          {activeTab === 'add' && (
            <AddAccountView
              t={t}
              editingAccount={editingAccount}
              onSaveAccount={handleSaveAccount}
              onCancelEdit={() => {
                setEditingAccount(null);
                setActiveTab('vault');
              }}
            />
          )}

          {activeTab === 'email' && (
            <EmailVaultView
              t={t}
              emails={vault.emails ?? []}
              openAddNonce={emailAddNonce}
              onCreateEmail={handleCreateEmail}
              onUpdateEmail={handleUpdateEmail}
              onDeleteEmail={handleDeleteEmail}
            />
          )}

          {activeTab === 'verify' && (
            <NotesDiaryView
              t={t}
              notes={vault.notes ?? []}
              openAddNonce={noteAddNonce}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'security' && (
            <SecurityBackupView
              t={t}
              profileMedia={vault.profileMedia ?? []}
              openAddNonce={mediaAddNonce}
              onAddProfileMedia={handleAddProfileMedia}
              onUpdateProfileMedia={handleUpdateProfileMedia}
              onDeleteProfileMedia={handleDeleteProfileMedia}
            />
          )}

          {activeTab === 'site-settings' && (
            <SiteSettingsView
              lang={lang}
              config={siteConfig}
              onSaveConfig={handleSaveSiteConfig}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-30 h-14 grid grid-cols-4 transition-colors ${
          showInsideWallpaper
            ? 'bg-gradient-to-t from-black/55 via-black/25 to-transparent'
            : 'border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm'
        }`}
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id !== 'add') setEditingAccount(null);
                setEmailAddNonce(0);
                setNoteAddNonce(0);
                setMediaAddNonce(0);
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                showInsideWallpaper
                  ? `drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] ${
                      active ? 'text-emerald-300' : 'text-white/85 hover:text-white'
                    }`
                  : active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[76px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* SADIYA — Inside Website Wallpaper Modal */}
      {sadiyaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={() => setSadiyaModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-950/90 backdrop-blur-md p-5 space-y-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                  <ImagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {lang === 'bn' ? 'SADIYA — ওয়েবসাইট ওয়ালপেপার' : 'SADIYA — Website Wallpaper'}
                  </h2>
                  <p className="text-[11px] text-white/70">
                    {lang === 'bn'
                      ? 'গ্যালারি থেকে ওয়েবসাইটের ভিতরের ওয়ালপেপার পরিবর্তন করুন।'
                      : 'Choose a wallpaper photo from your gallery for inside the site.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSadiyaModalOpen(false)}
                aria-label={t.close}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 h-36 rounded-xl overflow-hidden border border-white/20 bg-black shrink-0 shadow-sm">
                <img
                  src={insideWallpaperSrc}
                  alt="Inside Wallpaper Preview"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              <div className="flex-1 space-y-2.5">
                <input
                  ref={sadiyaFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInsideWallpaperPick}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={savingInsideWallpaper}
                  onClick={() => sadiyaFileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {savingInsideWallpaper ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                  <span>
                    {lang === 'bn' ? 'গ্যালারি থেকে ওয়ালপেপার দিন' : 'Pick Wallpaper from Gallery'}
                  </span>
                </button>

                {siteConfig.insideWallpaperDataUrl && (
                  <button
                    type="button"
                    disabled={savingInsideWallpaper}
                    onClick={handleResetInsideWallpaper}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 text-xs font-medium text-white/90 hover:bg-white/10 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'bn' ? 'লক স্ক্রিনের ওয়ালপেপারে ফিরুন' : 'Match Lock Screen Wallpaper'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-white/85 mb-1.5">
                {lang === 'bn'
                  ? `ওয়ালপেপার ডার্কনেস (${siteConfig.insideOverlayOpacity ?? 30}%)`
                  : `Wallpaper Dimming (${siteConfig.insideOverlayOpacity ?? 30}%)`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[0, 10, 20, 30, 35, 45, 60, 75].map((step) => {
                  const currentStep = siteConfig.insideOverlayOpacity ?? 30;
                  return (
                    <button
                      key={step}
                      type="button"
                      disabled={savingInsideWallpaper}
                      onClick={() => handleInsideOverlayStep(step)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        currentStep === step
                          ? 'bg-emerald-600 text-white'
                          : 'border border-white/20 bg-white/5 text-white/80 hover:bg-white/15'
                      }`}
                    >
                      {step}%
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-intrusive Toast Notification */}
      {toast && (
        <div className="fixed bottom-18 md:bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
