import { TestBed } from '@angular/core/testing';
import { Observable } from '@sst/core';
import { observableToSignal } from './to-signal.helper';

describe('observableToSignal', () => {
	it('returns the current Observable value as the initial signal value', () => {
		const o = new Observable<number>(7);
		TestBed.runInInjectionContext(() => {
			const s = observableToSignal(o);
			expect(s()).toBe(7);
		});
	});

	it('updates the signal when the observable changes', async () => {
		const o = new Observable<number>(0);
		await TestBed.runInInjectionContext(async () => {
			const s = observableToSignal(o);
			o.set(1);
			expect(s()).toBe(1);
			o.set(2);
			expect(s()).toBe(2);
		});
	});

	it('detaches the subscription when the injection context is destroyed', () => {
		const o = new Observable<number>(0);
		TestBed.runInInjectionContext(() => observableToSignal(o));
		// Destroy the test bed; subsequent updates must not throw.
		TestBed.resetTestingModule();
		expect(() => o.set(1)).not.toThrow();
	});
});
