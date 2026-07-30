const UTF8_BOM = '﻿';
const COMBINING_DIACRITICS = /[̀-ͯ]/g;
// Excel en configuración regional Argentina/es-AR usa "," como separador decimal,
// por lo que interpreta CSVs separados por coma como una sola columna. ";" es el
// separador que espera Excel en esa configuración, y Numbers/Sheets lo autodetectan igual.
const DELIMITER = ';';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes('"') || str.includes(DELIMITER) || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(DELIMITER));
  const csvContent = UTF8_BOM + lines.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
