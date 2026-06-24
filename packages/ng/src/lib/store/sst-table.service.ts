import { DestroyRef, Injectable, Signal, inject } from '@angular/core';
import {
	TableStore,
	type IFilterParams,
	type IPaginationParams,
	type ISortParams,
	type ITableStoreOptions,
} from '@sst/core';
import { observableToSignal } from './to-signal.helper';

/**
 * Angular-native table store: an abstract {@link TableStore} subclass that exposes the
 * store's reactive state as Angular {@link Signal}s for direct use in templates and
 * computed values.
 *
 * @remarks
 * This is the bridge between a repository and the {@link SstTableComponent}. Extend it,
 * mark it `@Injectable`, and call `super(options)` with at least a `repository` and a
 * `sortMap`. The inherited imperative mutators — `refresh`, `reset`, `updatePagination`,
 * `updateSort`, `updateFilter`, `updateSearch`, `bulkDelete` — remain available and
 * drive the signals below; whenever pagination, sort, filters, or search change, the
 * store automatically re-fetches.
 *
 * The constructor also registers a {@link DestroyRef} cleanup hook that calls
 * `destroy()`, tearing down the underlying observable subscriptions when the host
 * injector is destroyed — so consumers do not manage that lifecycle manually.
 *
 * @typeParam T - The row entity type.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UsersTableService extends SstTableService<User> {
 *   public constructor(repository: UsersRepository) {
 *     super({ repository, sortMap: { name: 'name', createdAt: 'created_at' } });
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class SstTableService<T> extends TableStore<T> {
	/** Current page of rows, as a signal. Mirrors the inherited `data$` observable. */
	public readonly data: Signal<readonly T[]>;
	/** Total number of rows across all pages, as a signal. Mirrors `total$`. */
	public readonly total: Signal<number>;
	/** Whether a fetch is in flight, as a signal. Mirrors `loading$`. */
	public readonly loading: Signal<boolean>;
	/** Current pagination state (page and page size), as a signal. Mirrors `pagination$`. */
	public readonly pagination: Signal<IPaginationParams>;
	/** Current sort descriptor, or `undefined` when unsorted, as a signal. Mirrors `sort$`. */
	public readonly sort: Signal<ISortParams | undefined>;
	/** Active filters, as a signal. Mirrors `filters$`. */
	public readonly filters: Signal<readonly IFilterParams[]>;
	/** Current search term, as a signal. Mirrors `search$`. */
	public readonly search: Signal<string>;

	/**
	 * Initializes the underlying {@link TableStore}, projects each of its observables
	 * into a signal, and registers automatic teardown on injector destruction.
	 *
	 * @param options - Store configuration; at minimum a `repository` and `sortMap`.
	 * See {@link ITableStoreOptions}.
	 */
	public constructor(options: ITableStoreOptions<T>) {
		super(options);
		this.data = observableToSignal(this.data$);
		this.total = observableToSignal(this.total$);
		this.loading = observableToSignal(this.loading$);
		this.pagination = observableToSignal(this.pagination$);
		this.sort = observableToSignal(this.sort$);
		this.filters = observableToSignal(this.filters$);
		this.search = observableToSignal(this.search$);
		inject(DestroyRef).onDestroy(() => this.destroy());
	}
}
