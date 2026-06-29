import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveTarget } from './target';

describe('resolveTarget', () => {
	let mounted: HTMLElement | undefined;

	beforeEach(() => {
		mounted = document.createElement('div');
		mounted.id = 'fixture';
		document.body.appendChild(mounted);
	});

	afterEach(() => {
		mounted?.remove();
		mounted = undefined;
	});

	it('returns the element when given an HTMLElement', () => {
		const el = document.createElement('section');
		expect(resolveTarget(el)).toBe(el);
	});

	it('resolves a string by querySelector', () => {
		expect(resolveTarget('#fixture')).toBe(mounted);
	});

	it('resolves any CSS selector', () => {
		mounted!.classList.add('foo');
		expect(resolveTarget('div.foo')).toBe(mounted);
	});

	it('throws with a useful message when the selector matches nothing', () => {
		expect(() => resolveTarget('#missing')).toThrow(/\[@bridgebyte\/sst-dom\] target not found.*#missing/);
	});
});
