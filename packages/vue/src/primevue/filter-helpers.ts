import type { IFilterParams } from '@bridgebyte/sst-core';
import type { DataTableFilterMeta } from 'primevue/datatable';

function readFilterValue(meta: unknown): unknown {
	if (meta && typeof meta === 'object') {
		if ('value' in meta) return (meta as { value: unknown }).value;
		if ('constraints' in meta) {
			const constraints = (meta as { constraints?: ReadonlyArray<{ value: unknown }> }).constraints;
			return constraints && constraints.length > 0 ? constraints[0]?.value : undefined;
		}
	}
	return undefined;
}

function readMatchMode(meta: unknown): string | undefined {
	if (meta && typeof meta === 'object') {
		if ('matchMode' in meta && typeof (meta as { matchMode?: unknown }).matchMode === 'string') {
			return (meta as { matchMode: string }).matchMode;
		}
		if ('constraints' in meta) {
			const first = (meta as { constraints?: ReadonlyArray<{ matchMode?: unknown }> }).constraints?.[0];
			if (first && typeof first.matchMode === 'string') return first.matchMode;
		}
	}
	return undefined;
}

function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || value === '';
}

/**
 * Build a `mapFilters` that maps a single column's filter value to the store's
 * free-text `search` (all other filter entries are ignored). Useful when the
 * backend exposes search rather than per-column filtering.
 *
 * @param field - The column field whose value drives `search`.
 */
export function searchColumn(field: string): (filters: DataTableFilterMeta) => { search?: string } {
	return (filters) => {
		const value = readFilterValue(filters?.[field]);
		return { search: isEmpty(value) ? '' : String(value) };
	};
}

/**
 * Build a `mapFilters` that emits value-based per-column filters plus a
 * companion `` `${key}${suffix}` `` filter carrying each column's `matchMode`
 * (default suffix `'MatchMode'`), and routes the `global` entry to `search`.
 *
 * @param options.suffix - Suffix for the companion matchMode key. Default `'MatchMode'`.
 */
export function withMatchModes(
	options: { suffix?: string } = {},
): (filters: DataTableFilterMeta) => { search?: string; filters?: IFilterParams[] } {
	const suffix = options.suffix ?? 'MatchMode';
	return (filters) => {
		const result: { search?: string; filters?: IFilterParams[] } = {};
		const out: IFilterParams[] = [];
		for (const [key, meta] of Object.entries(filters ?? {})) {
			const value = readFilterValue(meta);
			if (isEmpty(value)) continue;
			if (key === 'global') {
				result.search = String(value);
				continue;
			}
			out.push({ key, value: String(value) });
			const matchMode = readMatchMode(meta);
			if (matchMode) out.push({ key: `${key}${suffix}`, value: matchMode });
		}
		if (out.length > 0) result.filters = out;
		return result;
	};
}
