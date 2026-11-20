import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Globe,
  Lock,
  Mail,
  MailPlus,
  Menu,
  Moon,
  Plus,
  ShieldCheck,
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
import { VaultView } from './components/VaultView';
import { generateRecoveryCodes } from './lib/crypto/vaultCrypto';
import {
  deleteAccountDoc,
  deleteEmailDoc,
  deleteNoteDoc,
  deleteSheetDoc,
  migrateLocalDataToFirestoreOnce,
  replaceRecoveryCodesInFirestore,
  sanitizeDocId,
  subscribeToSharedVault,
  upsertAccountDoc,
  upsertEmailDoc,
  upsertNoteDoc,
  upsertSheetDoc,
} from './lib/firestoreVault';
import { getTranslations } from './lib/i18n';
import {
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
  SheetEntry,
  ThemeMode,
  VaultData,
} from './types';

const BRAND_PHOTO_URL = `${import.meta.env.BASE_URL}assets/aistudio/file_000000009a148208932f6c5646168244_7b1691f5.png`;

export default function App() {
  const [lang, setLang] = useState<Language>(() => loadLanguagePreference());
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference());

  const [siteUnlocked, setSiteUnlocked] = useState<boolean>(
    () => sessionStorage.getItem('kiron_site_unlocked') === '1'
  );

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
  const [editingAccount, setEditingAccount] = useState<AccountEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<{ name: string; password: string } | null>(null);
  const vaultRef = useRef<VaultData>(vault);
  vaultRef.current = vault;

  const t = getTranslations(lang);

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
        setVault((prev) => ({ ...prev, accounts, updatedAt: Date.now() }));
      },
      onEmails: (emails) => {
        setVault((prev) => ({ ...prev, emails, updatedAt: Date.now() }));
      },
      onNotes: (notes) => {
        setVault((prev) => ({ ...prev, notes, updatedAt: Date.now() }));
      },
      onSheets: (sheets) => {
        setVault((prev) => ({ ...prev, sheets, updatedAt: Date.now() }));
      },
      onRecoveryCodes: (recoveryCodes) => {
        setVault((prev) => ({ ...prev, recoveryCodes, updatedAt: Date.now() }));
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
    if (activeProfile) {
      await savePasswordProfileVault(activeProfile.name, activeProfile.password, nextVault);
    } else {
      await saveVaultData(nextVault, pass);
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
      nextAccounts = [savedEntry, ...current.accounts];
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
    await persistVault({ ...current, notes: [newNote, ...currentNotes] });
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
    await persistVault({ ...current, emails: [newEntry, ...currentEmails] });
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

  const handleCreateSheet = async (
    data: Omit<SheetEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const current = vaultRef.current;
    const now = Date.now();
    const rawId = crypto.randomUUID ? crypto.randomUUID() : `sheet-${now}`;
    const newSheet: SheetEntry = {
      ...data,
      id: sanitizeDocId(rawId),
      createdAt: now,
      updatedAt: now,
    };
    const currentSheets = current.sheets ?? [];
    await persistVault({ ...current, sheets: [newSheet, ...currentSheets] });
    showToast(t.sheetSavedToast);
    try {
      await upsertSheetDoc(newSheet);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSheet = async (
    id: string,
    patch: Partial<Omit<SheetEntry, 'id' | 'createdAt'>>
  ) => {
    const current = vaultRef.current;
    const currentSheets = current.sheets ?? [];
    const target = currentSheets.find((item) => item.id === id);
    if (!target) return;
    const updatedSheet: SheetEntry = {
      ...target,
      ...patch,
      updatedAt: Date.now(),
    };
    const nextSheets = currentSheets.map((item) => (item.id === id ? updatedSheet : item));
    await persistVault({ ...current, sheets: nextSheets });
    try {
      await upsertSheetDoc(updatedSheet);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSheet = async (id: string) => {
    const current = vaultRef.current;
    const currentSheets = current.sheets ?? [];
    const nextSheets = currentSheets.filter((item) => item.id !== id);
    await persistVault({ ...current, sheets: nextSheets });
    try {
      await deleteSheetDoc(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    const current = vaultRef.current;
    const nextCodes = generateRecoveryCodes(8);
    await persistVault({ ...current, recoveryCodes: nextCodes });
    try {
      await replaceRecoveryCodesInFirestore(current.recoveryCodes, nextCodes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSiteUnlock = async (password: string): Promise<boolean> => {
    const valid = await verifySiteEntryPassword(password);
    if (valid) {
      sessionStorage.setItem('kiron_site_unlocked', '1');
      setSiteUnlocked(true);
      return true;
    }
    return false;
  };

  if (!siteUnlocked) {
    return (
      <LockScreen
        t={t}
        lang={lang}
        theme={theme}
        isSiteGate
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
  }> = [
    { key: 'vault', id: 'vault', label: t.menuVault, icon: ShieldCheck },
    { key: 'add', id: 'add', label: t.navAdd, icon: Plus },
    { key: 'email', id: 'email', label: t.navEmail, icon: Mail },
    { key: 'add-email', id: 'email', label: t.menuAddEmail, icon: MailPlus, isAddEmail: true },
    { key: 'verify', id: 'verify', label: t.navVerify, icon: StickyNote },
    { key: 'security', id: 'security', label: t.navSecurity, icon: UserCheck },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Full-Height Left Vertical Drawer (triggered by Hamburger Menu ☰) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="relative z-10 w-72 max-w-[82vw] h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
          >
            {/* Drawer Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={BRAND_PHOTO_URL}
                  alt="KIRON - XP"
                  className="w-8 h-8 rounded-lg object-cover border border-emerald-500/40 shrink-0"
                />
                <span className="text-base font-bold tracking-tight whitespace-nowrap">
                  KIRON - XP
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t.close}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vertical Navigation Stack */}
            <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5" aria-label="Primary Navigation">
              {dropdownItems.map((item) => {
                const Icon = item.icon;
                const active = !item.isAddEmail && activeTab === item.id;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.id !== 'add') setEditingAccount(null);
                      setActiveTab(item.id);
                      if (item.isAddEmail) {
                        setEmailAddNonce((n) => n + 1);
                      }
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {active && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer: Status, Lock, Language & Theme Switches */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-2 min-w-0">
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${isEncrypted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
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
                    className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                  >
                    {t.lockVault}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
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
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Bar: Hamburger Menu (☰) and KIRON - XP name only */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-label="Menu"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={BRAND_PHOTO_URL}
              alt="KIRON - XP"
              className="w-8 h-8 rounded-lg object-cover border border-emerald-500/40 shrink-0"
            />
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              KIRON - XP
            </span>
          </div>
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
              sheets={vault.sheets ?? []}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onCreateSheet={handleCreateSheet}
              onUpdateSheet={handleUpdateSheet}
              onDeleteSheet={handleDeleteSheet}
            />
          )}

          {activeTab === 'security' && (
            <SecurityBackupView
              t={t}
              recoveryCodes={vault.recoveryCodes}
              onRegenerateRecoveryCodes={handleRegenerateRecoveryCodes}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Compact < 15% viewport height) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4"
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
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[76px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

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
