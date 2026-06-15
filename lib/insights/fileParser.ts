/**
 * File parser — CSV / XLSX → rows + columns.
 *
 * Lifted from faras-dashboard's `fileParser.js` and trimmed for what the
 * /insights/upload page needs:
 *
 *   • XLSX, XLS, CSV, TSV — all routed through `xlsx`'s sheet reader so
 *     we get a single code path that handles localized headers and date
 *     coercion correctly.
 *   • Header detection — heuristic scan over the first 10 rows; the row
 *     with the highest fraction of non-empty cells AND the lowest
 *     fraction of numeric cells wins. Skips banner / metadata rows.
 *   • Type coercion via DataEngine.detectColumns + parseRows so the
 *     downstream insight engine sees properly typed values.
 */

import * as XLSX from 'xlsx';
import { detectColumns, type Column, type Row } from './dataEngine';

export interface ParseResult {
  rows: Row[];
  columns: Column[];
  /** Sheet name when multi-sheet (XLSX); always present for consistency. */
  sheetName: string;
  /** How many rows / cells were skipped because of an empty header band. */
  skippedRows: number;
}

/** Detect the header row index inside a 2-D cell array. */
function detectHeaderRow(matrix: unknown[][]): number {
  const window = Math.min(matrix.length, 10);
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < window; i++) {
    const row = matrix[i] ?? [];
    const nonEmpty = row.filter((v) => v != null && String(v).trim() !== '').length;
    const numeric  = row.filter((v) => v != null && typeof v === 'number').length;
    if (nonEmpty < 2) continue;
    // Heuristic score: more populated cells + fewer numeric ones (numbers
    // belong to data rows, not headers).
    const score = nonEmpty - numeric * 1.5;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function parseCoerceRows(rawRows: Record<string, unknown>[], columns: Column[]): Row[] {
  return rawRows.map((r) => {
    const out: Row = {};
    for (const col of columns) {
      const v = r[col.name];
      if (v == null || v === '') {
        out[col.name] = null;
        continue;
      }
      if (col.type === 'number') {
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
        out[col.name] = Number.isNaN(n) ? null : n;
      } else if (col.type === 'date') {
        const d = v instanceof Date ? v : new Date(String(v));
        out[col.name] = Number.isNaN(d.getTime()) ? null : d;
      } else {
        out[col.name] = String(v);
      }
    }
    return out;
  });
}

/**
 * Parse a File (browser) into rows + columns.
 *
 * Throws when the file can't be parsed or contains zero data rows so the
 * caller can surface a clean error. Returns the first sheet when the
 * workbook has multiple — picking the right one is a future iteration.
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  // `cellDates: true` makes the parser coerce Excel date serials into JS
  // Date objects directly. `cellNF: false` drops the format strings we
  // don't need.
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, cellNF: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('الملف لا يحتوي على أوراق بيانات');

  const sheet = wb.Sheets[sheetName];
  // Get a 2-D array so we can hand-pick the header row instead of trusting
  // sheet_to_json's defaults — Excel files from Arabic accounting software
  // often carry 2-3 banner rows before the real headers.
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as unknown[][];

  if (matrix.length === 0) throw new Error('الملف فارغ');

  const headerIdx = detectHeaderRow(matrix);
  const headerRow = matrix[headerIdx];
  const headers = headerRow.map((h, i) => {
    const s = h == null ? '' : String(h).trim();
    return s || `العمود ${i + 1}`;
  });

  const dataRows: Record<string, unknown>[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every((v) => v == null || v === '')) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, j) => { obj[h] = row[j]; });
    dataRows.push(obj);
  }

  if (dataRows.length === 0) throw new Error('لم يتم العثور على بيانات في الملف');

  const columns = detectColumns(dataRows);
  const rows = parseCoerceRows(dataRows, columns);

  return {
    rows,
    columns,
    sheetName,
    skippedRows: headerIdx,
  };
}
