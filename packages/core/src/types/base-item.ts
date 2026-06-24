/**
 * Minimal shape every table row is expected to satisfy.
 *
 * @remarks
 * Repositories and the store identify rows by their `id` (for example when
 * bulk-deleting or fetching by id), so any item type used with the table should
 * be assignable to this interface.
 */
export interface IBaseItem {
	/** Stable, unique identifier of the row. */
	id: string;
	/** Optional human-readable label for the row. */
	name?: string | null;
}
