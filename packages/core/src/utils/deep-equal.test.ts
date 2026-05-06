import { describe, it, expect } from 'vitest';
import { deepEqual } from './deep-equal';

describe('deepEqual', () => {
	it('returns true for primitives equal under Object.is', () => {
		expect(deepEqual(1, 1)).toBe(true);
		expect(deepEqual('a', 'a')).toBe(true);
		expect(deepEqual(null, null)).toBe(true);
		expect(deepEqual(undefined, undefined)).toBe(true);
		expect(deepEqual(NaN, NaN)).toBe(true);
	});

	it('returns false for differing primitives', () => {
		expect(deepEqual(1, 2)).toBe(false);
		expect(deepEqual('a', 'b')).toBe(false);
		expect(deepEqual(null, undefined)).toBe(false);
	});

	it('compares arrays by length and element-wise', () => {
		expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
		expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false);
	});

	it('compares plain objects by enumerable own keys', () => {
		expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
		expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
		expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
	});

	it('compares nested structures', () => {
		expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
		expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
	});

	it('returns false when one side is null/undefined and the other is not', () => {
		expect(deepEqual(null, {})).toBe(false);
		expect(deepEqual([], null)).toBe(false);
	});
});
