import { ESortOrder, type ISortParams } from '../types/sort';
import type { IFilterParams } from '../types/filter';
import type { IPaginationParams } from '../types/pagination';
import type { HttpQueryParams } from '../types/http-client';
import type { IParamFormattingStrategy, IRepositoryQueryKeys } from '../types/repository-config';

export interface IMapTableParamsInput {
	readonly pagination: IPaginationParams;
	readonly sort?: ISortParams;
	readonly filters?: readonly IFilterParams[];
	readonly search?: string;
	readonly sortMap: Readonly<Record<string, string>>;
	readonly filterMap?: Readonly<Record<string, string>>;
	readonly queryKeys: IRepositoryQueryKeys;
	readonly paramFormatting?: IParamFormattingStrategy;
}

export function mapTableParams(input: IMapTableParamsInput): HttpQueryParams {
	const { pagination, sort, filters, search, sortMap, filterMap, queryKeys, paramFormatting } = input;
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
			params[queryKeys.orderByDescending] = sort.order === ESortOrder.DESC;
		}
	}

	params[queryKeys.page] = pagination.page;
	params[queryKeys.pageSize] = pagination.pageSize;

	if (search && search.length > 0) {
		params[queryKeys.search] = search;
	}

	return params as HttpQueryParams;
}
