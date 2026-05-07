import { DestroyRef, Injectable, Signal, inject } from '@angular/core';
import { TableStore, type IFilterParams, type IPaginationParams, type ISortParams, type ITableStoreOptions } from '@sst/core';
import { observableToSignal } from './to-signal.helper';

@Injectable()
export abstract class SstTableService<T> extends TableStore<T> {
	public readonly data: Signal<readonly T[]>;
	public readonly total: Signal<number>;
	public readonly loading: Signal<boolean>;
	public readonly pagination: Signal<IPaginationParams>;
	public readonly sort: Signal<ISortParams | undefined>;
	public readonly filters: Signal<readonly IFilterParams[]>;
	public readonly search: Signal<string>;

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
