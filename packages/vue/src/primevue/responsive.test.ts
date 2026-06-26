import { describe, it, expect } from 'vitest';
import { resolveLayoutSlot, BREAKPOINT_ORDER, RESERVED_LAYOUT_SLOTS, type BreakpointToken } from './responsive';

const set = (...names: string[]): ReadonlySet<string> => new Set(names);

describe('resolveLayoutSlot', () => {
	it('cascades a single xs slot up to the table breakpoint (lg)', () => {
		const r = (current: BreakpointToken) =>
			resolveLayoutSlot({ definedSlots: set('xs'), current, tableBreakpoint: 'lg' });
		expect(r('xs')).toBe('xs');
		expect(r('sm')).toBe('xs');
		expect(r('md')).toBe('xs');
		expect(r('lg')).toBeNull(); // table owns >= lg
		expect(r('xl')).toBeNull();
	});

	it('lets a larger defined slot override the smaller one in its range', () => {
		const r = (current: BreakpointToken) =>
			resolveLayoutSlot({ definedSlots: set('xs', 'md'), current, tableBreakpoint: 'lg' });
		expect(r('xs')).toBe('xs');
		expect(r('sm')).toBe('xs');
		expect(r('md')).toBe('md');
		expect(r('lg')).toBeNull();
	});

	it('falls back to the table when no defined slot covers the current width', () => {
		const r = (current: BreakpointToken) =>
			resolveLayoutSlot({ definedSlots: set('md'), current, tableBreakpoint: 'lg' });
		expect(r('xs')).toBeNull(); // nothing <= xs is defined
		expect(r('sm')).toBeNull();
		expect(r('md')).toBe('md');
		expect(r('lg')).toBeNull();
	});

	it('always returns null (table) when no layout slots are defined', () => {
		for (const current of BREAKPOINT_ORDER) {
			expect(resolveLayoutSlot({ definedSlots: set(), current, tableBreakpoint: 'lg' })).toBeNull();
		}
	});

	it("never renders the table when tableBreakpoint is 'none'", () => {
		const r = (current: BreakpointToken) =>
			resolveLayoutSlot({ definedSlots: set('xs', 'lg'), current, tableBreakpoint: 'none' });
		expect(r('xs')).toBe('xs');
		expect(r('md')).toBe('xs'); // cascades up from xs
		expect(r('lg')).toBe('lg');
		expect(r('2xl')).toBe('lg'); // cascades up from lg
	});

	it('ignores defined slots at or above the table breakpoint', () => {
		// #xl is defined but tableBreakpoint is lg, so xl never renders.
		expect(resolveLayoutSlot({ definedSlots: set('xl'), current: 'xl', tableBreakpoint: 'lg' })).toBeNull();
	});

	it('reserves exactly the six breakpoint tokens', () => {
		expect([...RESERVED_LAYOUT_SLOTS].sort()).toEqual(['2xl', 'lg', 'md', 'sm', 'xl', 'xs']);
	});
});
