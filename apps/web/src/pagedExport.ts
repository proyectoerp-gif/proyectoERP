export type ExportPage<T> = { items: T[]; nextCursor: string | null };

export async function collectExportPages<T>(fetchPage: (cursor: string) => Promise<ExportPage<T>>, rowKey: (row: T) => string, signal: AbortSignal, progress?: (count: number) => void): Promise<T[]> {
  const rows: T[] = [], identifiers = new Set<string>(), cursors = new Set<string>();
  let cursor = '';
  do {
    if (signal.aborted) throw new Error('Exportación cancelada.');
    if (cursors.has(cursor)) throw new Error('La paginación se repitió. Actualiza antes de descargar.');
    cursors.add(cursor);
    const page = await fetchPage(cursor);
    if (signal.aborted) throw new Error('Exportación cancelada.');
    if (!Array.isArray(page.items) || (page.nextCursor !== null && (typeof page.nextCursor !== 'string' || !page.nextCursor || !page.items.length))) throw new Error('La API devolvió una página incompleta.');
    for (const row of page.items) {
      const id = rowKey(row);
      if (!id || identifiers.has(id)) throw new Error('Los registros cambiaron durante la consulta. Intenta de nuevo.');
      identifiers.add(id); rows.push(row);
    }
    if (rows.length > 10000 || (rows.length === 10000 && page.nextCursor)) throw new Error('La exportación admite hasta 10,000 registros. Aplica filtros.');
    progress?.(rows.length); cursor = page.nextCursor ?? '';
  } while (cursor);
  return rows;
}
