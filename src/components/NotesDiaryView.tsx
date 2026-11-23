import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Pin,
  PinOff,
  Search,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../lib/i18n';
import { NoteColor, NoteEntry } from '../types';

interface NotesDiaryViewProps {
  t: Translations;
  notes: NoteEntry[];
  openAddNonce?: number;
  onCreateNote: (note: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote: (id: string, patch: Partial<Omit<NoteEntry, 'id' | 'createdAt'>>) => void;
  onDeleteNote: (id: string) => void;
}

const NOTE_COLORS: Array<{
  id: NoteColor;
  cardClass: string;
  swatchClass: string;
}> = [
  {
    id: 'default',
    cardClass: 'bg-black/20 backdrop-blur-[2px] border-white/20',
    swatchClass: 'bg-slate-800 border-white/40',
  },
  {
    id: 'emerald',
    cardClass: 'bg-emerald-950/40 backdrop-blur-[2px] border-emerald-400/35',
    swatchClass: 'bg-emerald-700 border-emerald-400',
  },
  {
    id: 'amber',
    cardClass: 'bg-amber-950/40 backdrop-blur-[2px] border-amber-400/35',
    swatchClass: 'bg-amber-700 border-amber-400',
  },
  {
    id: 'sky',
    cardClass: 'bg-sky-950/40 backdrop-blur-[2px] border-sky-400/35',
    swatchClass: 'bg-sky-700 border-sky-400',
  },
  {
    id: 'rose',
    cardClass: 'bg-rose-950/40 backdrop-blur-[2px] border-rose-400/35',
    swatchClass: 'bg-rose-700 border-rose-400',
  },
  {
    id: 'violet',
    cardClass: 'bg-violet-950/40 backdrop-blur-[2px] border-violet-400/35',
    swatchClass: 'bg-violet-700 border-violet-400',
  },
];

function getCardColorClass(color: NoteColor): string {
  return NOTE_COLORS.find((c) => c.id === color)?.cardClass ?? NOTE_COLORS[0].cardClass;
}

function formatNoteDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

export function NotesDiaryView({
  t,
  notes,
  openAddNonce = 0,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: NotesDiaryViewProps) {
  const [search, setSearch] = useState('');

  // Composer triggered from Hamburger Menu (XP - 3)
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [pinned, setPinned] = useState(false);

  // Edit modal state
  const [editingNote, setEditingNote] = useState<NoteEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<NoteColor>('default');
  const [editPinned, setEditPinned] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-note-menu]')) {
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
      setTitle('');
      setContent('');
      setColor('default');
      setPinned(false);
      setComposerOpen(true);
    }
  }, [openAddNonce]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, search]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.pinned),
    [filteredNotes]
  );
  const otherNotes = useMemo(
    () => filteredNotes.filter((n) => !n.pinned),
    [filteredNotes]
  );

  const resetComposer = () => {
    setComposerOpen(false);
    setTitle('');
    setContent('');
    setColor('default');
    setPinned(false);
  };

  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() && !content.trim()) {
      resetComposer();
      return;
    }
    onCreateNote({
      title: title.trim(),
      content: content.trim(),
      color,
      pinned,
    });
    resetComposer();
  };

  const openEditor = (note: NoteEntry) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color);
    setEditPinned(note.pinned);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    if (!editTitle.trim() && !editContent.trim()) {
      setEditingNote(null);
      return;
    }
    onUpdateNote(editingNote.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      color: editColor,
      pinned: editPinned,
    });
    setEditingNote(null);
  };

  const handleCopyNote = async (note: NoteEntry) => {
    const fullText = [note.title, note.content].filter(Boolean).join('\n\n') || 'MD KIRON MONDAL';
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedId(note.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === note.id ? null : prev));
      }, 1500);
    } catch {
      // ignore
    }
  };

  const renderNoteCard = (note: NoteEntry) => {
    const isConfirming = confirmDeleteId === note.id;
    const isCopied = copiedId === note.id;
    const copyLabel = t.secondsShort === 'সে.' ? 'কপি' : 'Copy';

    return (
      <article
        key={note.id}
        className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors hover:shadow-sm ${getCardColorClass(
          note.color
        )}`}
      >
        <div className="space-y-2 min-w-0 flex-1 drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)]">
          {/* Header: MD KIRON MONDAL + Pencil menu (Edit / Copy / Delete) */}
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate">
              MD KIRON MONDAL
            </h3>

            <div className="relative shrink-0" data-note-menu>
              <button
                type="button"
                onClick={() => setOpenMenuId((prev) => (prev === note.id ? null : note.id))}
                aria-expanded={openMenuId === note.id}
                aria-haspopup="menu"
                title={t.editAccount}
                aria-label={t.editAccount}
                className={`inline-flex items-center justify-center p-0.5 rounded transition-colors ${
                  openMenuId === note.id
                    ? 'text-emerald-300'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {openMenuId === note.id && (
                <div
                  role="menu"
                  className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-40 rounded-xl border border-white/20 bg-slate-950/95 backdrop-blur-md shadow-2xl py-1.5 z-40"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenuId(null);
                      openEditor(note);
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
                      handleCopyNote(note);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 text-left transition-colors whitespace-nowrap"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    )}
                    <span>{isCopied ? t.copied : copyLabel}</span>
                  </button>

                  <div className="my-1 border-t border-white/15" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenuId(null);
                      setConfirmDeleteId(isConfirming ? null : note.id);
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

          {note.title && (
            <p className="text-xs sm:text-sm font-semibold text-white/95 break-words leading-snug">
              {note.title}
            </p>
          )}

          {note.content && (
            <p className="text-xs sm:text-sm text-white/85 whitespace-pre-wrap break-words leading-relaxed max-h-52 overflow-hidden">
              {note.content}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2 text-[11px] text-white/70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          <span className="tabular-nums truncate">{formatNoteDate(note.updatedAt)}</span>
          <div className="flex items-center gap-2 shrink-0">
            {isCopied && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-300">
                <Check className="w-3 h-3" />
                <span>{t.copied}</span>
              </span>
            )}
            {note.pinned && (
              <Pin className="w-3 h-3 text-emerald-300" />
            )}
          </div>
        </div>

        {isConfirming && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-red-950/75 border border-red-400/50 text-xs">
            <span className="text-red-100 font-medium">{t.noteDeleteConfirm}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(note.id);
                  setConfirmDeleteId(null);
                }}
                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {t.confirmDelete}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-2 py-0.5 rounded border border-white/25 text-white"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-4">
      {/* Full-Width Search Bar */}
      {notes.length > 0 && (
        <div className="relative w-full">
          <Search className="w-5 h-5 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.notesSearchPlaceholder}
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

      {/* Note Composer (only opened from Hamburger Menu -> XP - 3) */}
      {composerOpen && (
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleCreateSubmit}
            className="rounded-xl border border-white/20 bg-slate-950/90 backdrop-blur-md p-4 space-y-3 shadow-xl transition-colors text-white"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.noteTitlePlaceholder}
                className="flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-white/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPinned((v) => !v)}
                title={pinned ? t.noteUnpinAction : t.notePinAction}
                className={`p-1.5 rounded-lg transition-colors ${
                  pinned
                    ? 'text-emerald-300 bg-emerald-500/20'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            </div>

            <textarea
              autoFocus
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleCreateSubmit();
                }
              }}
              placeholder={t.noteBodyPlaceholder}
              className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/50 focus:outline-none resize-y leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/15">
              {/* Color swatches */}
              <div className="flex items-center gap-1.5" aria-label={t.noteColorLabel}>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    aria-label={c.id}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      c.swatchClass
                    } ${
                      color === c.id
                        ? 'scale-110 ring-2 ring-emerald-400/60'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetComposer}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  {t.close}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  {t.noteSaveBtn}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Notes Grid or Empty State */}
      {notes.length === 0 && !composerOpen ? (
        <div className="bg-black/25 backdrop-blur-xs border border-white/20 rounded-2xl p-10 text-center max-w-xl mx-auto text-white">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/35 text-emerald-300 flex items-center justify-center mx-auto mb-4">
            <StickyNote className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-white">
            {t.noteEmptyTitle}
          </h2>
          <p className="mt-1.5 text-sm text-white/75 leading-relaxed">
            {t.noteEmptyDesc}
          </p>
        </div>
      ) : filteredNotes.length === 0 && !composerOpen ? (
        <div className="bg-black/20 backdrop-blur-xs border border-white/15 rounded-xl p-8 text-center text-sm text-white/80">
          {t.noteNoMatch}
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/75 px-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {t.notePinnedHeading}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
                {pinnedNotes.map(renderNoteCard)}
              </div>
            </div>
          )}

          {otherNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <div className="text-xs font-semibold uppercase tracking-wider text-white/75 px-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {t.noteOthersHeading}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
                {otherNotes.map(renderNoteCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-slate-950/90 backdrop-blur-md p-5 space-y-4 shadow-2xl text-white"
          >
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t.noteTitlePlaceholder}
                className="flex-1 bg-transparent text-base font-semibold text-white placeholder:text-white/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setEditPinned((v) => !v)}
                title={editPinned ? t.noteUnpinAction : t.notePinAction}
                className={`p-1.5 rounded-lg transition-colors ${
                  editPinned
                    ? 'text-emerald-300 bg-emerald-500/20'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                {editPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                aria-label={t.close}
                className="p-1.5 rounded-lg text-white/65 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              autoFocus
              rows={7}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={t.noteBodyPlaceholder}
              className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/50 focus:outline-none resize-y leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/15">
              <div className="flex items-center gap-1.5" aria-label={t.noteColorLabel}>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setEditColor(c.id)}
                    aria-label={c.id}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      c.swatchClass
                    } ${
                      editColor === c.id
                        ? 'scale-110 ring-2 ring-emerald-400/60'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/25 text-xs font-medium text-white/85 hover:bg-white/10 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  {t.noteSaveBtn}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
