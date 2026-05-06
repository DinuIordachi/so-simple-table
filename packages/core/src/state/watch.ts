import type { IReadonlyObservable, Unsubscribe } from './observable';

export function watch(
	observables: ReadonlyArray<IReadonlyObservable<unknown>>,
	callback: () => void,
): Unsubscribe {
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
