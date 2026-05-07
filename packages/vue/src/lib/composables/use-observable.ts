import { onScopeDispose, ref, type Ref } from 'vue';
import type { IReadonlyObservable } from '@sst/core';

export function useObservable<T>(source: IReadonlyObservable<T>): Readonly<Ref<T>> {
	const r = ref<T>(source.get()) as Ref<T>;
	const unsubscribe = source.subscribe((value) => {
		r.value = value;
	}, { emitOnSubscribe: false });
	onScopeDispose(unsubscribe);
	return r;
}
