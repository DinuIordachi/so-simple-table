import { DestroyRef, Signal, inject, signal } from '@angular/core';
import type { IReadonlyObservable } from '@sst/core';

/**
 * Bridges an `@sst/core` {@link IReadonlyObservable} into a read-only Angular
 * {@link Signal}, so core's framework-agnostic reactive state can be consumed
 * directly in templates and computed signals.
 *
 * @remarks
 * Must be called within an Angular injection context (e.g. a constructor or field
 * initializer), as it injects {@link DestroyRef} to register cleanup. The signal is
 * seeded with the observable's current value via `source.get()`, then updated on each
 * subsequent emission. `emitOnSubscribe: false` avoids a redundant initial emission
 * since the seed already captures the present value. The underlying subscription is
 * disposed automatically when the host injector is destroyed.
 *
 * @typeParam T - The value type carried by the observable and resulting signal.
 * @param source - The core read-only observable to mirror.
 * @returns A read-only signal that tracks the observable's latest value.
 */
export function observableToSignal<T>(source: IReadonlyObservable<T>): Signal<T> {
	const internal = signal<T>(source.get());
	const destroyRef = inject(DestroyRef);
	const unsubscribe = source.subscribe((value) => internal.set(value), { emitOnSubscribe: false });
	destroyRef.onDestroy(unsubscribe);
	return internal.asReadonly();
}
