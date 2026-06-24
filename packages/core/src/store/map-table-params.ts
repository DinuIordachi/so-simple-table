import { ESortOrder, type ISortParams } from '../types/sort';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { HttpQueryParams } from '../types/http-client';
import type {
	IParamFormattingStrategy,
	IRepositoryQueryKeys,
	ISortDirections,
	PaginationStyle,
	SortStyle,
} from '../types/repository-config';

/**
 * Inputs for {@link mapTableParams}: the current table state plus the mappings
 * and key names used to translate it into query parameters.
 */
export interface IMapTableParamsInput {
	/** Current pagination; always emitted. */
	readonly pagination: IPaginationParams;
	/** Active sort, if any. */
	readonly sort?: ISortParams;
	/** Active filters, if any. */
	readonly filters?: readonly IFilterParams[];
	/** Free-text search term, if any. */
	readonly search?: string;
	/** Maps a sort field name to the value sent to the backend. */
	readonly sortMap: Readonly<Record<string, string>>;
	/** Maps a filter key to the query-param name; identity when absent. */
	readonly filterMap?: Readonly<Record<string, string>>;
	/** Names of the page/sort/search query keys. */
	readonly queryKeys: IRepositoryQueryKeys;
	/** Optional hooks for customizing filter and sort formatting. */
	readonly paramFormatting?: IParamFormattingStrategy;
	/** Pagination wire style; `'page'` (default) or `'offset'` (skip + limit). */
	readonly paginationStyle?: PaginationStyle;
	/** Sort wire style; `'flag'` (default) or `'direction'` (asc/desc token). */
	readonly sortStyle?: SortStyle;
	/** Tokens for `'direction'` sort style; defaults to `{ asc: 'asc', desc: 'desc' }`. */
	readonly sortDirections?: ISortDirections;
}

/**
 * Translates the current table state into the query-parameter object sent to a
 * repository.
 *
 * @remarks
 * Filters sharing a mapped key are grouped into an array. Sort is emitted only
 * when `sort.field` resolves through `sortMap`, setting the `orderBy` key (after
 * any `formatSortField`) and the `orderByDescending` boolean. Pagination is
 * always included; the search key is added only for a non-empty term.
 *
 * @returns The assembled query parameters.
 *
 * @example
 * ```ts
 * const params = mapTableParams({
 * 	pagination: { page: 1, pageSize: 20 },
 * 	sort: { id: 'name', field: 'name', order: ESortOrder.DESC },
 * 	filters: [{ key: 'status', value: 'active' }],
 * 	sortMap: { name: 'fullName' },
 * 	queryKeys: DEFAULT_QUERY_KEYS,
 * });
 * // → { status: ['active'], orderBy: 'fullName', orderByDescending: true, page: 1, pageSize: 20 }
 * ```
 */
export function mapTableParams(input: IMapTableParamsInput): HttpQueryParams {
	const { pagination, sort, filters, search, sortMap, filterMap, queryKeys, paramFormatting } = input;
	const paginationStyle = input.paginationStyle ?? 'page';
	const sortStyle = input.sortStyle ?? 'flag';
	const sortDirections = input.sortDirections ?? { asc: 'asc', desc: 'desc' };
	const formatSortField = paramFormatting?.formatSortField ?? ((field: string) => field);
	const params: Record<string, unknown> = {};

	if (filters && filters.length > 0) {
		for (const filter of filters) {
			const key = filterMap?.[filter.key] ?? filter.key;
			const existing = params[key];
			if (Array.isArray(existing)) {
				existing.push(filter.value);
			} else {
				params[key] = [filter.value];
			}
		}
	}

	if (sort) {
		const mapped = sortMap[sort.field];
		if (mapped !== undefined) {
			params[queryKeys.orderBy] = formatSortField(mapped);
			params[queryKeys.orderByDescending] =
				sortStyle === 'direction'
					? sort.order === ESortOrder.DESC
						? sortDirections.desc
						: sortDirections.asc
					: sort.order === ESortOrder.DESC;
		}
	}

	if (paginationStyle === 'offset') {
		params[queryKeys.page] = (pagination.page - 1) * pagination.pageSize;
	} else {
		params[queryKeys.page] = pagination.page;
	}
	params[queryKeys.pageSize] = pagination.pageSize;

	if (search && search.length > 0) {
		params[queryKeys.search] = search;
	}

	return params as HttpQueryParams;
}
