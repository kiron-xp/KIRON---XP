import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Columns3,
  Copy,
  Download,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
  Rows3,
  Table,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../lib/i18n';
import { SheetEntry } from '../types';

const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 10;
const CELL_SIZE_STORAGE_KEY = 'kiron_sheet_cell_size_v1';

const COL_WIDTH_CLASSES = [
  'w-[56px] min-w-[56px] sm:w-[66px] sm:min-w-[66px]',
  'w-[78px] min-w-[78px] sm:w-[92px] sm:min-w-[92px]',
  'w-[110px] min-w-[110px] sm:w-[132px] sm:min-w-[132px]',
  'w-[152px] min-w-[152px] sm:w-[178px] sm:min-w-[178px]',
  'w-[205px] min-w-[205px] sm:w-[240px] sm:min-w-[240px]',
] as const;

const CELL_HEIGHT_CLASSES = [
  'h-5 text-[10px]',
  'h-7 text-[11px] sm:text-xs',
  'h-9 text-xs sm:text-sm',
  'h-11 text-sm',
  'h-14 text-sm sm:text-base',
] as const;

function clampSizeLevel(val: unknown): number {
  const num = typeof val === 'number' ? Math.round(val) : 1;
  return Math.min(4, Math.max(0, Number.isFinite(num) ? num : 1));
}

function loadSavedCellSize(): { w: number; h: number } {
  try {
    const raw = localStorage.getItem(CELL_SIZE_STORAGE_KEY);
    if (!raw) return { w: 1, h: 1 };
    const parsed = JSON.parse(raw) as { w?: unknown; h?: unknown };
    return {
      w: clampSizeLevel(parsed.w),
      h: clampSizeLevel(parsed.h),
    };
  } catch {
    return { w: 1, h: 1 };
  }
}

interface SheetsPanelProps {
  t: Translations;
  sheets: SheetEntry[];
  onCreateSheet: (data: Omit<SheetEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateSheet: (
    id: string,
    patch: Partial<Omit<SheetEntry, 'id' | 'createdAt'>>
  ) => void;
  onDeleteSheet: (id: string) => void;
}

function getColumnLetter(index: number): string {
  let col = '';
  let n = index;
  while (n >= 0) {
    col = String.fromCharCode((n % 26) + 65) + col;
    n = Math.floor(n / 26) - 1;
  }
  return col;
}

function buildBlankRows(rowCount = DEFAULT_ROWS, colCount = DEFAULT_COLS): string[][] {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => '')
  );
}

function normalizeGrid(
  rows: string[][],
  minRows = DEFAULT_ROWS,
  minCols = DEFAULT_COLS
): string[][] {
  const targetCols = Math.max(minCols, rows[0]?.length ?? 0);
  const targetRows = Math.max(minRows, rows.length);
  return Array.from({ length: targetRows }, (_, rIdx) => {
    const existingRow = rows[rIdx] ?? [];
    return Array.from({ length: targetCols }, (_, cIdx) => existingRow[cIdx] ?? '');
  });
}

export function SheetsPanel({
  t,
  sheets,
  onCreateSheet,
  onUpdateSheet,
  onDeleteSheet,
}: SheetsPanelProps) {
  const sortedSheets = useMemo(
    () => [...sheets].sort((a, b) => b.updatedAt - a.updatedAt),
    [sheets]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState<{ w: number; h: number }>(() => loadSavedCellSize());

  useEffect(() => {
    try {
      localStorage.setItem(CELL_SIZE_STORAGE_KEY, JSON.stringify(cellSize));
    } catch {
      // ignore storage quota errors
    }
  }, [cellSize]);

  const stepBothSize = (delta: number) => {
    setCellSize((prev) => ({
      w: clampSizeLevel(prev.w + delta),
      h: clampSizeLevel(prev.h + delta),
    }));
  };

  const stepWidthSize = (delta: number) => {
    setCellSize((prev) => ({
      ...prev,
      w: clampSizeLevel(prev.w + delta),
    }));
  };

  const stepHeightSize = (delta: number) => {
    setCellSize((prev) => ({
      ...prev,
      h: clampSizeLevel(prev.h + delta),
    }));
  };

  const resetCellSize = () => {
    setCellSize({ w: 1, h: 1 });
  };

  useEffect(() => {
    if (sortedSheets.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sortedSheets.some((s) => s.id === selectedId)) {
      setSelectedId(sortedSheets[0].id);
    }
  }, [sortedSheets, selectedId]);

  const activeSheet = useMemo(
    () => sortedSheets.find((s) => s.id === selectedId) ?? sortedSheets[0] ?? null,
    [sortedSheets, selectedId]
  );

  const [draftTitle, setDraftTitle] = useState('');
  const [draftRows, setDraftRows] = useState<string[][]>(() => buildBlankRows());
  const saveTimerRef = useRef<number | null>(null);
  const activeSheetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeSheet) {
      activeSheetIdRef.current = null;
      setDraftTitle('');
      setDraftRows(buildBlankRows());
      return;
    }

    if (activeSheetIdRef.current !== activeSheet.id) {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      activeSheetIdRef.current = activeSheet.id;
      setDraftTitle(activeSheet.title);
      setDraftRows(normalizeGrid(activeSheet.rows));
    }
  }, [activeSheet]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const scheduleSave = (sheetId: string, patch: Partial<Omit<SheetEntry, 'id' | 'createdAt'>>) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      onUpdateSheet(sheetId, patch);
    }, 350);
  };

  const flushSaveNow = (sheetId: string, rowsToSave: string[][], titleToSave?: string) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    onUpdateSheet(sheetId, {
      rows: rowsToSave,
      ...(titleToSave !== undefined ? { title: titleToSave } : {}),
    });
  };

  const handleCreateNewSheet = () => {
    const nextNumber = sheets.length + 1;
    onCreateSheet({
      title: `${t.sheetDefaultTitle} ${nextNumber}`,
      rows: buildBlankRows(DEFAULT_ROWS, DEFAULT_COLS),
    });
  };

  const handleTitleChange = (value: string) => {
    setDraftTitle(value);
    if (!activeSheet) return;
    scheduleSave(activeSheet.id, { title: value, rows: draftRows });
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    if (!activeSheet) return;
    const nextRows = draftRows.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row
    );
    setDraftRows(nextRows);
    scheduleSave(activeSheet.id, { title: draftTitle, rows: nextRows });
  };

  const handleAddRow = () => {
    if (!activeSheet) return;
    const cols = draftRows[0]?.length || DEFAULT_COLS;
    const nextRows = [...draftRows, Array.from({ length: cols }, () => '')];
    setDraftRows(nextRows);
    flushSaveNow(activeSheet.id, nextRows, draftTitle);
  };

  const handleDeleteRow = (rowIdx: number) => {
    if (!activeSheet || draftRows.length <= 1) return;
    const nextRows = draftRows.filter((_, idx) => idx !== rowIdx);
    setDraftRows(nextRows);
    flushSaveNow(activeSheet.id, nextRows, draftTitle);
  };

  const handleAddCol = () => {
    if (!activeSheet) return;
    const nextRows = draftRows.map((row) => [...row, '']);
    setDraftRows(nextRows);
    flushSaveNow(activeSheet.id, nextRows, draftTitle);
  };

  const handleDeleteCol = (colIdx: number) => {
    if (!activeSheet) return;
    const cols = draftRows[0]?.length || 0;
    if (cols <= 1) return;
    const nextRows = draftRows.map((row) => row.filter((_, idx) => idx !== colIdx));
    setDraftRows(nextRows);
    flushSaveNow(activeSheet.id, nextRows, draftTitle);
  };

  const handleCopyTsv = async () => {
    if (!activeSheet) return;
    const tsv = draftRows.map((row) => row.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiedId(activeSheet.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === activeSheet.id ? null : prev));
      }, 1500);
    } catch {
      // ignore
    }
  };

  const handleDownloadCsv = () => {
    if (!activeSheet) return;
    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const csv = draftRows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (draftTitle || 'sheet')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '-');
    a.download = `${safeName || 'kiron-sheet'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colCount = draftRows[0]?.length ?? 0;

  const columnTotals = useMemo(() => {
    if (!activeSheet) return [];
    const cols = draftRows[0]?.length ?? 0;
    return Array.from({ length: cols }, (_, cIdx) => {
      let hasNumber = false;
      let sum = 0;
      for (const row of draftRows) {
        const raw = (row[cIdx] ?? '').trim();
        if (!raw) continue;
        const num = Number(raw.replace(/,/g, ''));
        if (!Number.isNaN(num) && Number.isFinite(num)) {
          hasNumber = true;
          sum += num;
        }
      }
      return hasNumber ? sum : null;
    });
  }, [activeSheet, draftRows]);

  const anyColumnHasSum = columnTotals.some((val) => val !== null);

  return (
    <div className="space-y-4">
      {/* Sheet Tabs Bar + New Sheet Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {sortedSheets.map((sheet) => {
            const active = activeSheet?.id === sheet.id;
            return (
              <button
                key={sheet.id}
                type="button"
                onClick={() => {
                  setSelectedId(sheet.id);
                  setConfirmDeleteId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors max-w-[180px] ${
                  active
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Table className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{sheet.title || t.sheetDefaultTitle}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCreateNewSheet}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.sheetNewBtn}</span>
        </button>
      </div>

      {/* Empty State or Active Sheet Grid */}
      {!activeSheet ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Table className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.sheetEmptyTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t.sheetEmptyDesc}
          </p>
          <button
            type="button"
            onClick={handleCreateNewSheet}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t.sheetNewBtn}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => flushSaveNow(activeSheet.id, draftRows, draftTitle)}
                placeholder={t.sheetTitlePlaceholder}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/25 focus:border-emerald-600"
              />
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                {draftRows.length}×{colCount}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Rows3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.sheetAddRow}</span>
              </button>

              <button
                type="button"
                onClick={handleAddCol}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Columns3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.sheetAddCol}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyTsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                {copiedId === activeSheet.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedId === activeSheet.id ? t.copied : t.sheetCopyTsv}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.sheetDownloadCsv}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmDeleteId((prev) => (prev === activeSheet.id ? null : activeSheet.id))
                }
                aria-label={t.deleteAccount}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cell Resize Controls Bar */}
          <div className="px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-wrap items-center gap-2 text-xs">
            {/* Unified Cell Size - / + */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <span className="px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                {t.sheetCellSizeLabel}
              </span>
              <button
                type="button"
                onClick={() => stepBothSize(-1)}
                disabled={cellSize.w === 0 && cellSize.h === 0}
                aria-label={t.sheetSizeShrink}
                title={t.sheetSizeShrink}
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetCellSize}
                title="Reset"
                className="px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 min-w-[54px] text-center border-x border-slate-200 dark:border-slate-700 transition-colors"
              >
                {cellSize.w === cellSize.h
                  ? t.sheetSizeNames[cellSize.w]
                  : `${t.sheetSizeNames[cellSize.w]} × ${t.sheetSizeNames[cellSize.h]}`}
              </button>
              <button
                type="button"
                onClick={() => stepBothSize(1)}
                disabled={cellSize.w === 4 && cellSize.h === 4}
                aria-label={t.sheetSizeGrow}
                title={t.sheetSizeGrow}
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Independent Width - / + */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                <MoveHorizontal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{t.sheetWidthLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => stepWidthSize(-1)}
                disabled={cellSize.w === 0}
                aria-label={`${t.sheetWidthLabel} -`}
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 border-x border-slate-200 dark:border-slate-700">
                {t.sheetSizeNames[cellSize.w]}
              </span>
              <button
                type="button"
                onClick={() => stepWidthSize(1)}
                disabled={cellSize.w === 4}
                aria-label={`${t.sheetWidthLabel} +`}
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Independent Height - / + */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                <MoveVertical className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{t.sheetHeightLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => stepHeightSize(-1)}
                disabled={cellSize.h === 0}
                aria-label={`${t.sheetHeightLabel} -`}
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 border-x border-slate-200 dark:border-slate-700">
                {t.sheetSizeNames[cellSize.h]}
              </span>
              <button
                type="button"
                onClick={() => stepHeightSize(1)}
                disabled={cellSize.h === 4}
                aria-label={`${t.sheetHeightLabel} +`}
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {confirmDeleteId === activeSheet.id && (
            <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 flex items-center justify-between gap-2 text-xs">
              <span className="text-red-700 dark:text-red-300 font-medium">
                {t.sheetDeleteConfirm}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSheet(activeSheet.id);
                    setConfirmDeleteId(null);
                  }}
                  className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {t.confirmDelete}
                </button>
              </div>
            </div>
          )}

          {/* Compact 100-Row Scrollable Spreadsheet Grid */}
          <div className="max-h-[65vh] overflow-auto">
            <table className="border-collapse text-[11px] sm:text-xs table-fixed">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                  <th className="sticky left-0 z-30 w-10 min-w-[40px] bg-slate-100 dark:bg-slate-950 border-b border-r border-slate-200 dark:border-slate-800 py-1 text-center font-mono text-[10px] font-semibold">
                    #
                  </th>
                  {Array.from({ length: colCount }, (_, colIdx) => (
                    <th
                      key={colIdx}
                      className={`${COL_WIDTH_CLASSES[cellSize.w]} bg-slate-100 dark:bg-slate-950 border-b border-r border-slate-200 dark:border-slate-800 px-1 py-1 font-mono text-[10px] font-semibold`}
                    >
                      <div className="flex items-center justify-between gap-0.5">
                        <span className="mx-auto">{getColumnLetter(colIdx)}</span>
                        {colCount > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCol(colIdx)}
                            title={t.deleteAccount}
                            className="p-0.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draftRows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={
                      rowIdx === 0
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-medium'
                        : 'bg-white dark:bg-slate-900'
                    }
                  >
                    <td className="sticky left-0 z-10 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 px-1 py-0.5 text-center font-mono text-[10px] tabular-nums">
                      <div className="flex items-center justify-center gap-0.5">
                        <span>{rowIdx + 1}</span>
                        {draftRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(rowIdx)}
                            title={t.deleteAccount}
                            className="opacity-40 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {row.map((cellVal, colIdx) => (
                      <td
                        key={colIdx}
                        className="border-b border-r border-slate-200 dark:border-slate-800 p-0"
                      >
                        <input
                          type="text"
                          value={cellVal}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          onBlur={() => flushSaveNow(activeSheet.id, draftRows, draftTitle)}
                          className={`w-full ${CELL_HEIGHT_CLASSES[cellSize.h]} px-1.5 py-0.5 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-emerald-50/70 dark:focus:bg-emerald-950/35 focus:ring-1 focus:ring-inset focus:ring-emerald-600`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                {anyColumnHasSum && (
                  <tr className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-950 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <td className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-950 border-t border-r border-slate-200 dark:border-slate-800 px-1 py-1.5 text-center text-[10px]">
                      {t.sheetTotalLabel}
                    </td>
                    {columnTotals.map((total, colIdx) => (
                      <td
                        key={colIdx}
                        className="border-t border-r border-slate-200 dark:border-slate-800 px-1.5 py-1.5 tabular-nums truncate"
                      >
                        {total !== null ? Number(total.toFixed(4)).toString() : ''}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
