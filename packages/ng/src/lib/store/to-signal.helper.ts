import { DestroyRef, Signal, inject, signal } from '@angular/core';
import type { IReadonlyObservable } from '@sst/core';

/**
 * Bridge an `@sst/core` IReadonlyObservable<T> into an Angular Signal<T>.
 * Must be called within an injection context. The subscription is auto-cleaned
 * via DestroyRef when the host injector is destroyed.
 */
export function observableToSignal<T>(source: IReadonlyObservable<T>): Signal<T> {
	const internal = signal<T>(source.get());
	const destroyRef = inject(DestroyRef);
	const unsubscribe = source.subscribe((value) => internal.set(value), { emitOnSubscribe: false });
	destroyRef.onDestroy(unsubscribe);
	return internal.asReadonly();
}
