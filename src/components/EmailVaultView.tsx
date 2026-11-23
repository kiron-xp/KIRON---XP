import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Mail,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../lib/i18n';
import { resizeImageToDataUrl } from '../lib/storage';
import { EmailEntry } from '../types';
import { AccountAvatar } from './AccountAvatar';

interface EmailVaultViewProps {
  t: Translations;
  emails: EmailEntry[];
  openAddNonce?: number;
  onCreateEmail: (data: Omit<EmailEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateEmail: (
    id: string,
    patch: Partial<Omit<EmailEntry, 'id' | 'createdAt'>>
  ) => Promise<void>;
  onDeleteEmail: (id: string) => Promise<void>;
}

export function EmailVaultView({
  t,
  emails,
  openAddNonce = 0,
  onCreateEmail,
  onUpdateEmail,
  onDeleteEmail,
}: EmailVaultViewProps) {
  const [query, setQuery] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-email-menu]')) {
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

  useEffect(() => {
    if (openAddNonce > 0) {
      openAddComposer();
    }
  }, [openAddNonce]);

  const filteredEmails = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...emails].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (item) =>
        item.email.toLowerCase().includes(q) ||
        (item.note ?? '').toLowerCase().includes(q) ||
        (item.label ?? '').toLowerCase().includes(q)
    );
  }, [emails, query]);

  const resetForm = () => {
    setEmailInput('');
    setPasswordInput('');
    setCaptionInput('');
    setAvatarDataUrl(undefined);
    setShowFormPassword(false);
    setFormError('');
    setEditingId(null);
    setComposerOpen(false);
  };

  const openAddComposer = () => {
    setEditingId(null);
    setEmailInput('');
    setPasswordInput('');
    setCaptionInput('');
    setAvatarDataUrl(undefined);
    setShowFormPassword(false);
    setFormError('');
    setComposerOpen(true);
  };

  const openEditComposer = (entry: EmailEntry) => {
    setEditingId(entry.id);
    setEmailInput(entry.email);
    setPasswordInput(entry.password ?? '');
    setCaptionInput(entry.note ?? entry.label ?? '');
    setAvatarDataUrl(entry.avatarDataUrl);
    setShowFormPassword(false);
    setFormError('');
    setComposerOpen(true);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setFormError(t.emailRequiredError);
      return;
    }

    const cleanCaption = captionInput.trim() || undefined;
    const payload = {
      email: cleanEmail,
      password: passwordInput.trim() || undefined,
      note: cleanCaption,
      label: undefined,
      avatarDataUrl,
    };

    if (editingId) {
      await onUpdateEmail(editingId, payload);
    } else {
      await onCreateEmail(payload);
    }
    resetForm();
  };

  const handleCopy = async (value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Transparent Search Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.emailSearchPlaceholder}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-white/25 bg-black/20 backdrop-blur-xs text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/60 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t.close}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-white/75 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add / Edit Email Composer Card (Dark Frosted Glass) */}
      {composerOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/20 bg-black/45 backdrop-blur-md p-5 space-y-4 text-white shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>{editingId ? t.emailEditTitle : t.emailAddTitle}</span>
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              aria-label={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5">
                {t.emailAddressLabel} *
              </label>
              <input
                type="text"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setFormError('');
                }}
                placeholder={t.emailAddressPlaceholder}
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-white/25 bg-black/30 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5">
                {t.emailPasswordField}
              </label>
              <div className="relative">
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={t.emailPasswordPlaceholder}
                  className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-white/25 bg-black/30 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/65 hover:text-white"
                >
                  {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/80 mb-1.5">
              {t.emailNoteField}
            </label>
            <input
              type="text"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder={t.emailNotePlaceholder}
              className="w-full px-3 py-2.5 rounded-lg border border-white/25 bg-black/30 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/80 mb-2">
              {t.galleryIconLabel}
            </label>
            <div className="flex items-center gap-4">
              <AccountAvatar
                issuer={emailInput || 'EMAIL'}
                avatarDataUrl={avatarDataUrl}
                size="lg"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/25 bg-black/30 hover:bg-black/45 text-xs font-medium text-white cursor-pointer transition-colors">
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.removeIconBtn}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs font-medium text-rose-300">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-2 rounded-lg border border-white/25 text-xs font-medium text-white/85 hover:bg-white/10"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              {t.emailSaveBtn}
            </button>
          </div>
        </form>
      )}

      {/* Email Rows (No White Boxes — Floating cleanly over wallpaper) */}
      {emails.length === 0 && !composerOpen ? (
        <div className="rounded-xl border border-dashed border-white/25 bg-black/25 backdrop-blur-xs p-10 text-center space-y-3 text-white">
          <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">
            {t.emailEmptyTitle}
          </h3>
          <p className="text-xs text-white/75 max-w-md mx-auto">
            {t.emailEmptyDesc}
          </p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-black/20 backdrop-blur-xs p-8 text-center text-sm text-white/80">
          {t.emailNoMatch}
        </div>
      ) : (
        <div className="divide-y divide-white/15">
          {filteredEmails.map((entry) => {
            const isRevealed = Boolean(revealedIds[entry.id]);
            const caption = entry.note ?? entry.label;
            const emailCopyKey = `email-copy-${entry.id}`;
            const isEmailCopied = copiedKey === emailCopyKey;
            const copyKey = `right-copy-${entry.id}`;
            const isCopied = copiedKey === copyKey;
            const rightValueToCopy = entry.password || entry.email;

            return (
              <div
                key={entry.id}
                className="bg-transparent py-3.5 px-1 sm:px-2 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3 sm:gap-5">
                  <div className="min-w-0 flex-1 flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <AccountAvatar
                        issuer={entry.email}
                        avatarDataUrl={entry.avatarDataUrl}
                        size="lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(entry.email, emailCopyKey)}
                        title={entry.email}
                        className={`min-w-[56px] inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] ${
                          isEmailCopied
                            ? 'border-emerald-400 bg-emerald-600/85 text-white'
                            : 'border-white/25 bg-black/20 hover:bg-black/40 text-white'
                        }`}
                      >
                        {isEmailCopied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>{t.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{t.secondsShort === 'সে.' ? 'কপি' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.98)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          MD KIRON MONDAL
                        </h3>

                        <div className="relative shrink-0" data-email-menu>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((prev) => (prev === entry.id ? null : entry.id))
                            }
                            aria-expanded={openMenuId === entry.id}
                            aria-haspopup="menu"
                            title={t.editAccount}
                            aria-label={t.editAccount}
                            className={`inline-flex items-center justify-center p-0.5 rounded transition-colors ${
                              openMenuId === entry.id
                                ? 'text-emerald-300'
                                : 'text-white/75 hover:text-white'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {openMenuId === entry.id && (
                            <div
                              role="menu"
                              className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-40 rounded-xl border border-white/20 bg-slate-950/95 backdrop-blur-md shadow-2xl py-1.5 z-40"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  openEditComposer(entry);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 text-left transition-colors whitespace-nowrap"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-white/60 shrink-0" />
                                <span>{t.editAccount}</span>
                              </button>

                              <div className="my-1 border-t border-white/15" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDeleteConfirmId((prev) =>
                                    prev === entry.id ? null : entry.id
                                  );
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

                      <p className="text-xs sm:text-sm font-semibold text-white/95 break-all">
                        {entry.email}
                      </p>

                      {caption && (
                        <p className="text-xs text-white/80 break-words">
                          {caption}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Unboxed SADIYA / Password + subtle Copy button */}
                  <div className="self-center flex flex-col items-end gap-1.5 shrink-0 max-w-[175px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (entry.password) toggleReveal(entry.id);
                      }}
                      title={entry.password ? 'Show / Hide password' : 'SADIYA'}
                      className="inline-flex items-center justify-end gap-1.5 px-1 py-0.5 bg-transparent border-0 text-sm font-extrabold tracking-wider text-emerald-300 transition-colors hover:text-emerald-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.98)] max-w-full"
                    >
                      <span className="truncate font-mono">
                        {isRevealed && entry.password ? entry.password : 'SADIYA'}
                      </span>
                      {entry.password && (
                        isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5 shrink-0 text-white/75" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 shrink-0 text-white/75" />
                        )
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(rightValueToCopy, copyKey)}
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
                </div>

                {/* Inline Delete Confirm */}
                {deleteConfirmId === entry.id && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-red-950/75 backdrop-blur-xs border border-red-400/50 text-xs">
                    <span className="text-red-100 font-medium">
                      {t.emailDeleteConfirm}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 rounded border border-white/25 text-white hover:bg-white/10 transition-colors"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteEmail(entry.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                      >
                        {t.confirmDelete}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
