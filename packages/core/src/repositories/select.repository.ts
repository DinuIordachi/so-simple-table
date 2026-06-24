import { ListRepository } from './list.repository';
import type { IPaginationParams, IResponse, IResponseList } from '../types';

/**
 * Read-oriented repository that augments {@link ListRepository} with single-row
 * and id-based lookups, suited to selection or picker scenarios.
 *
 * @typeParam T - Row type.
 */
export abstract class SelectRepository<T> extends ListRepository<T> {
	/** Fetches a single row by its id. */
	public abstract get(id: string): Promise<IResponse<T>>;

	/** Fetches the rows for the given ids, optionally paginated. */
	public abstract getListByIdList(
		ids: readonly string[],
		pagination?: IPaginationParams,
	): Promise<IResponseList<T[]>>;
}
