import type { IReadonlyObservable, Unsubscribe } from './observable';

/**
 * Subscribes to multiple observables and invokes a callback when any of them
 * changes, coalescing bursts of synchronous changes into a single call.
 *
 * @remarks
 * Subscriptions use `emitOnSubscribe: false`, so the callback does not run on
 * setup — only on subsequent changes. Triggers are debounced via
 * `queueMicrotask`, so several updates in the same synchronous tick result in
 * one callback invocation on the next microtask.
 *
 * @param observables - Observables to watch.
 * @param callback - Invoked once per microtask after any watched value changes.
 * @returns A function that unsubscribes from all watched observables.
 */
export function watch(observables: ReadonlyArray<IReadonlyObservable<unknown>>, callback: () => void): Unsubscribe {
	let scheduled = false;
	const trigger = (): void => {
		if (scheduled) {
			return;
		}
		scheduled = true;
		queueMicrotask(() => {
			scheduled = false;
			callback();
		});
	};
	const unsubs = observables.map((o) => o.subscribe(trigger, { emitOnSubscribe: false }));
	return () => unsubs.forEach((u) => u());
}
