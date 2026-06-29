import { describe, it, expect } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { Observable } from '@bridgebyte/sst-core';
import { useObservable } from './use-observable';

describe('useObservable', () => {
	it('initializes the ref with the observable current value', () => {
		const o = new Observable<number>(7);
		const scope = effectScope();
		scope.run(() => {
			const r = useObservable(o);
			expect(r.value).toBe(7);
		});
		scope.stop();
	});

	it('updates the ref when the observable changes', async () => {
		const o = new Observable<number>(0);
		const scope = effectScope();
		await scope.run(async () => {
			const r = useObservable(o);
			o.set(1);
			await nextTick();
			expect(r.value).toBe(1);
			o.set(2);
			await nextTick();
			expect(r.value).toBe(2);
		});
		scope.stop();
	});

	it('detaches the subscription when the effect scope is stopped', () => {
		const o = new Observable<number>(0);
		const scope = effectScope();
		const r = scope.run(() => useObservable(o))!;
		scope.stop();
		o.set(99);
		// Without auto-cleanup the ref would still update; assert that it does NOT.
		expect(r.value).toBe(0);
	});
});
