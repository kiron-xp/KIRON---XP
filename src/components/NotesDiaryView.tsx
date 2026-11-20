import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Pin,
  PinOff,
  Search,
  StickyNote,
  Table,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../lib/i18n';
import { NoteColor, NoteEntry, SheetEntry } from '../types';
import { SheetsPanel } from './SheetsPanel';

interface NotesDiaryViewProps {
  t: Translations;
  notes: NoteEntry[];
  sheets: SheetEntry[];
  onCreateNote: (note: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote: (id: string, patch: Partial<Omit<NoteEntry, 'id' | 'createdAt'>>) => void;
  onDeleteNote: (id: string) => void;
  onCreateSheet: (sheet: Omit<SheetEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSheet: (id: string, patch: Partial<Omit<SheetEntry, 'id' | 'createdAt'>>) => void;
  onDeleteSheet: (id: string) => void;
}

const NOTE_COLORS: Array<{
  id: NoteColor;
  cardClass: string;
  swatchClass: string;
}> = [
  {
    id: 'default',
    cardClass:
      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    swatchClass:
      'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
  },
  {
    id: 'emerald',
    cardClass:
      'bg-emerald-50/90 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/70',
    swatchClass:
      'bg-emerald-200 dark:bg-emerald-700 border-emerald-400 dark:border-emerald-500',
  },
  {
    id: 'amber',
    cardClass:
      'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70',
    swatchClass:
      'bg-amber-200 dark:bg-amber-700 border-amber-400 dark:border-amber-500',
  },
  {
    id: 'sky',
    cardClass:
      'bg-sky-50/90 dark:bg-sky-950/45 border-sky-200 dark:border-sky-800/70',
    swatchClass:
      'bg-sky-200 dark:bg-sky-700 border-sky-400 dark:border-sky-500',
  },
  {
    id: 'rose',
    cardClass:
      'bg-rose-50/90 dark:bg-rose-950/45 border-rose-200 dark:border-rose-800/70',
    swatchClass:
      'bg-rose-200 dark:bg-rose-700 border-rose-400 dark:border-rose-500',
  },
  {
    id: 'violet',
    cardClass:
      'bg-violet-50/90 dark:bg-violet-950/45 border-violet-200 dark:border-violet-800/70',
    swatchClass:
      'bg-violet-200 dark:bg-violet-700 border-violet-400 dark:border-violet-500',
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
  sheets,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateSheet,
  onUpdateSheet,
  onDeleteSheet,
}: NotesDiaryViewProps) {
  const [mode, setMode] = useState<'notes' | 'sheets'>('notes');
  const [search, setSearch] = useState('');

  // Quick Keep-style composer
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

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    const fullText = [note.title, note.content].filter(Boolean).join('\n\n');
    if (!fullText) return;
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

    return (
      <article
        key={note.id}
        className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors hover:shadow-sm ${getCardColorClass(
          note.color
        )}`}
      >
        <div
          onClick={() => openEditor(note)}
          className="cursor-pointer space-y-2 min-w-0 flex-1"
        >
          <div className="flex items-start justify-between gap-2">
            {note.title ? (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
                {note.title}
              </h3>
            ) : (
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                {formatNoteDate(note.updatedAt)}
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateNote(note.id, { pinned: !note.pinned });
              }}
              title={note.pinned ? t.noteUnpinAction : t.notePinAction}
              aria-label={note.pinned ? t.noteUnpinAction : t.notePinAction}
              className={`p-1 rounded-md shrink-0 transition-colors ${
                note.pinned
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-600/10'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </div>

          {note.content && (
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed max-h-52 overflow-hidden">
              {note.content}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
            {note.title ? formatNoteDate(note.updatedAt) : ''}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyNote(note)}
              title={t.copyCode}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => openEditor(note)}
              title={t.editAccount}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setConfirmDeleteId(isConfirming ? null : note.id)}
              title={t.deleteAccount}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isConfirming && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs">
            <span className="text-red-700 dark:text-red-300 font-medium">{t.noteDeleteConfirm}</span>
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
                className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
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
    <div className="space-y-6">
      {/* Mode Switcher: Notes vs Sheets */}
      <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMode('notes')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
            mode === 'notes'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <StickyNote className="w-4 h-4" />
          <span>{t.notesTabLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('sheets')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
            mode === 'sheets'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>{t.sheetsTabLabel}</span>
        </button>
      </div>

      {mode === 'sheets' ? (
        <SheetsPanel
          t={t}
          sheets={sheets}
          onCreateSheet={onCreateSheet}
          onUpdateSheet={onUpdateSheet}
          onDeleteSheet={onDeleteSheet}
        />
      ) : (
        <>
          {/* Full-Width Search Bar */}
          {notes.length > 0 && (
        <div className="relative w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.notesSearchPlaceholder}
            className="w-full pl-11 pr-10 py-3 text-sm sm:text-base rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600"
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

      {/* Keep-style Expandable Note Composer */}
      <div className="max-w-2xl mx-auto">
        {!composerOpen ? (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-left text-sm text-slate-500 dark:text-slate-400 shadow-xs transition-colors"
          >
            <span>{t.takeNotePlaceholder}</span>
            <StickyNote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </button>
        ) : (
          <form
            onSubmit={handleCreateSubmit}
            className={`rounded-xl border p-4 space-y-3 shadow-sm transition-colors ${getCardColorClass(
              color
            )}`}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.noteTitlePlaceholder}
                className="flex-1 bg-transparent text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPinned((v) => !v)}
                title={pinned ? t.noteUnpinAction : t.notePinAction}
                className={`p-1.5 rounded-lg transition-colors ${
                  pinned
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-600/10'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none resize-y leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/10">
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
                        ? 'scale-110 ring-2 ring-emerald-600/40'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetComposer}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  {t.close}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  {t.noteSaveBtn}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Notes Grid or Empty State */}
      {notes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <StickyNote className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.noteEmptyTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t.noteEmptyDesc}
          </p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {t.noteNoMatch}
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
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
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleEditSubmit}
            className={`w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-xl ${getCardColorClass(
              editColor
            )}`}
          >
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t.noteTitlePlaceholder}
                className="flex-1 bg-transparent text-base font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setEditPinned((v) => !v)}
                title={editPinned ? t.noteUnpinAction : t.notePinAction}
                className={`p-1.5 rounded-lg transition-colors ${
                  editPinned
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-600/10'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {editPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                aria-label={t.close}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none resize-y leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/5 dark:border-white/10">
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
                        ? 'scale-110 ring-2 ring-emerald-600/40'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  {t.noteSaveBtn}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
        </>
      )}
    </div>
  );
}
