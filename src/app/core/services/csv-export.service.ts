import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  /**
   * Export an array of objects to a CSV file that is automatically downloaded.
   * @param rows - Array of plain objects. Keys of the first row are used as headers.
   * @param filename - Downloaded file name (without extension).
   * @param headers - Optional human-readable column headers (same order as keys).
   */
  export<T extends Record<string, unknown>>(
    rows: T[],
    filename: string,
    headers?: string[]
  ): void {
    if (!rows.length) return;

    const keys = Object.keys(rows[0]) as (keyof T)[];
    const headerRow = headers?.length === keys.length ? headers : keys.map(k => String(k));

    const csvLines: string[] = [
      headerRow.map(h => this.escapeCell(h)).join(','),
      ...rows.map(row =>
        keys.map(k => this.escapeCell(row[k])).join(',')
      )
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeCell(value: unknown): string {
    const str = value == null ? '' : String(value);
    // Wrap in quotes if the value contains a comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
