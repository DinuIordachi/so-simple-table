import { SelectRepository } from './select.repository';
import type { IResponse } from '../types';

/**
 * Full CRUD repository contract, extending {@link SelectRepository} with create,
 * update, delete, and duplicate operations.
 *
 * @typeParam T - Row type.
 */
export abstract class Repository<T> extends SelectRepository<T> {
	/** Creates a new row from the given payload. */
	public abstract create(dto: object): Promise<IResponse<unknown>>;
	/** Updates the row identified by `id` with the given payload. */
	public abstract update(id: string, dto: object): Promise<IResponse<unknown>>;
	/** Deletes a row by `id`, or the collection root when `id` is omitted. */
	public abstract delete(id?: string): Promise<IResponse<unknown>>;
	/** Duplicates the row identified by `id`. */
	public abstract duplicate(id: string): Promise<IResponse<string>>;
}
