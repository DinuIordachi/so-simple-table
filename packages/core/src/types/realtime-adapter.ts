import type { ITableStore } from './table-store';
import type { Unsubscribe } from '../state/observable';

/**
 * Connects a real-time data source (WebSocket, SSE, etc.) to a table store.
 * Implementations are intentionally out of scope for the core package — this
 * interface only locks in the contract so plugins can be added without churn.
 */
export interface IRealtimeAdapter<T> {
	/**
	 * Wires the live data source to the given store and returns a function that
	 * disconnects the source and releases its resources.
	 */
	connect(store: ITableStore<T>): Unsubscribe;
}
