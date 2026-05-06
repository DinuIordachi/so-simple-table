import { describe, it, expect, vi } from 'vitest';
import { Observable } from './observable';

describe('Observable', () => {
	it('returns the initial value via get()', () => {
		const o = new Observable<number>(7);
		expect(o.get()).toBe(7);
	});

	it('emits the current value to a subscriber by default', () => {
		const o = new Observable<string>('a');
		const listener = vi.fn();
		o.subscribe(listener);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith('a', 'a');
	});

	it('skips initial emission when emitOnSubscribe is false', () => {
		const o = new Observable<number>(0);
		const listener = vi.fn();
		o.subscribe(listener, { emitOnSubscribe: false });
		expect(listener).not.toHaveBeenCalled();
	});

	it('notifies all subscribers when value changes', () => {
		const o = new Observable<number>(0);
		const a = vi.fn();
		const b = vi.fn();
		o.subscribe(a, { emitOnSubscribe: false });
		o.subscribe(b, { emitOnSubscribe: false });
		o.set(1);
		expect(a).toHaveBeenCalledWith(1, 0);
		expect(b).toHaveBeenCalledWith(1, 0);
	});

	it('does not notify when set() is called with the same value (Object.is)', () => {
		const o = new Observable<number>(5);
		const listener = vi.fn();
		o.subscribe(listener, { emitOnSubscribe: false });
		o.set(5);
		expect(listener).not.toHaveBeenCalled();
	});

	it('treats NaN === NaN as equal (Object.is)', () => {
		const o = new Observable<number>(NaN);
		const listener = vi.fn();
		o.subscribe(listener, { emitOnSubscribe: false });
		o.set(NaN);
		expect(listener).not.toHaveBeenCalled();
	});

	it('returns an unsubscribe function that removes the listener', () => {
		const o = new Observable<number>(0);
		const listener = vi.fn();
		const unsubscribe = o.subscribe(listener, { emitOnSubscribe: false });
		unsubscribe();
		o.set(1);
		expect(listener).not.toHaveBeenCalled();
	});

	it('isolates listeners — removing one does not affect the others', () => {
		const o = new Observable<number>(0);
		const keep = vi.fn();
		const remove = vi.fn();
		o.subscribe(keep, { emitOnSubscribe: false });
		const off = o.subscribe(remove, { emitOnSubscribe: false });
		off();
		o.set(1);
		expect(keep).toHaveBeenCalledTimes(1);
		expect(remove).not.toHaveBeenCalled();
	});

	it('snapshots subscribers at notify time so unsubscribing during emit is safe', () => {
		const o = new Observable<number>(0);
		const a = vi.fn(() => off());
		const b = vi.fn();
		const off = o.subscribe(a, { emitOnSubscribe: false });
		o.subscribe(b, { emitOnSubscribe: false });
		expect(() => o.set(1)).not.toThrow();
		expect(b).toHaveBeenCalledWith(1, 0);
	});

	it('provides a readonly view via asReadonly()', () => {
		const o = new Observable<number>(3);
		const ro = o.asReadonly();
		expect(ro.get()).toBe(3);
		const listener = vi.fn();
		ro.subscribe(listener, { emitOnSubscribe: false });
		o.set(4);
		expect(listener).toHaveBeenCalledWith(4, 3);
		// @ts-expect-error — readonly view must not expose set
		expect(ro.set).toBeUndefined();
	});
});
