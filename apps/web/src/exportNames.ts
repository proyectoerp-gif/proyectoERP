import { catalogLookup, type CatalogKind } from './catalogApi';
import { warehouseLookup } from './inventoryApi';
import { ApiError } from './webApi';
export async function exportNames(base: string, token: string, signal: AbortSignal, groups: { kind: CatalogKind | 'warehouses'; prefix: string; ids: string[] }[]) {
  const names: Record<string, string> = {};
  for (const group of groups) {
    const ids = [...new Set(group.ids)];
    try {
      for (let index = 0; index < ids.length; index += 20) {
        if (signal.aborted) throw new Error('Exportación cancelada.');
        const page = group.kind === 'warehouses' ? await warehouseLookup(base, token, signal, ids.slice(index, index + 20)) : await catalogLookup(base, group.kind, token, signal, ids.slice(index, index + 20));
        for (const row of page) names[group.prefix + ':' + row.id] = row.name;
      }
    } catch (error) {
      // Records remain readable by identifier when the viewer cannot read that catalog.
      if (!(error instanceof ApiError && error.status === 403)) throw error;
    }
  }
  return names;
}
