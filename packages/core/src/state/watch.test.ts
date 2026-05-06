import { describe, it, expect, vi } from 'vitest';
import { Observable } from './observable';
import { watch } from './watch';

describe('watch', () => {
	it('does not fire on subscribe (skipInitial behavior is implicit)', async () => {
		const a = new Observable<number>(0);
		const b = new Observable<number>(0);
		const cb = vi.fn();
		watch([a, b], cb);
		await Promise.resolve();
		expect(cb).not.toHaveBeenCalled();
	});

	it('fires once when an observable changes', async () => {
		const a = new Observable<number>(0);
		const cb = vi.fn();
		watch([a], cb);
		a.set(1);
		await Promise.resolve();
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('coalesces synchronous updates into a single microtask call', async () => {
		const a = new Observable<number>(0);
		const b = new Observable<number>(0);
		const cb = vi.fn();
		watch([a, b], cb);
		a.set(1);
		a.set(2);
		b.set(7);
		expect(cb).not.toHaveBeenCalled();
		await Promise.resolve();
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('returns an unsubscribe that detaches all listeners', async () => {
		const a = new Observable<number>(0);
		const cb = vi.fn();
		const off = watch([a], cb);
		off();
		a.set(1);
		await Promise.resolve();
		expect(cb).not.toHaveBeenCalled();
	});
});
