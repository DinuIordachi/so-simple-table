import { onScopeDispose, ref, type Ref } from 'vue';
import type { IReadonlyObservable } from '@bridgebyte/sst-core';

/**
 * Bridges a framework-agnostic `@bridgebyte/sst-core` {@link IReadonlyObservable} to a
 * reactive Vue {@link Ref}.
 *
 * The returned ref is seeded with the observable's current value and stays in
 * sync with every subsequent emission. The underlying subscription is released
 * automatically when the surrounding effect scope is torn down.
 *
 * @typeParam T - Type of the value held by the observable.
 * @param source - The core observable to mirror into Vue reactivity.
 * @returns A read-only ref that always reflects the observable's latest value.
 *
 * @remarks
 * Must be called synchronously inside a component `setup` or other active
 * effect scope, since cleanup relies on {@link onScopeDispose}. Calling it
 * outside a scope leaves the subscription un-disposed.
 *
 * The ref is typed read-only because its value is owned by the source
 * observable; assign through the observable rather than the ref.
 */
export function useObservable<T>(source: IReadonlyObservable<T>): Readonly<Ref<T>> {
	const r = ref<T>(source.get()) as Ref<T>;
	const unsubscribe = source.subscribe(
		(value) => {
			r.value = value;
		},
		{ emitOnSubscribe: false },
	);
	onScopeDispose(unsubscribe);
	return r;
}
