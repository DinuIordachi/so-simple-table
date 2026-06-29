import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, h, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useBreakpoint } from './use-breakpoint';
import type { BreakpointToken } from './responsive';

/** Minimal controllable `window.matchMedia` mock keyed by `(min-width: Npx)`. */
function installMatchMedia(initialWidth: number): { setWidth(next: number): void } {
	interface MQ {
		media: string;
		matches: boolean;
		px: number;
		listeners: Set<() => void>;
		addEventListener(type: string, cb: () => void): void;
		removeEventListener(type: string, cb: () => void): void;
	}
	const entries: MQ[] = [];
	let width = initialWidth;
	(window as unknown as { matchMedia(q: string): MQ }).matchMedia = (query: string): MQ => {
		const px = Number(/(\d+)px/.exec(query)?.[1] ?? 0);
		const entry: MQ = {
			media: query,
			px,
			matches: width >= px,
			listeners: new Set<() => void>(),
			addEventListener: (_type, cb) => entry.listeners.add(cb),
			removeEventListener: (_type, cb) => entry.listeners.delete(cb),
		};
		entries.push(entry);
		return entry;
	};
	return {
		setWidth(next: number): void {
			width = next;
			for (const entry of entries) {
				entry.matches = next >= entry.px;
				for (const cb of entry.listeners) cb();
			}
		},
	};
}

function harness(options?: { ssrDefault?: BreakpointToken }): { bp: Ref<BreakpointToken> } {
	let bp!: Ref<BreakpointToken>;
	const Comp = defineComponent({
		setup() {
			bp = useBreakpoint(options);
			return () => h('div');
		},
	});
	mount(Comp);
	return {
		get bp() {
			return bp;
		},
	};
}

afterEach(() => {
	delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

describe('useBreakpoint', () => {
	it("reports 'xs' below the sm breakpoint", () => {
		installMatchMedia(500);
		expect(harness().bp.value).toBe('xs');
	});

	it("reports 'md' between md and lg", () => {
		installMatchMedia(800);
		expect(harness().bp.value).toBe('md');
	});

	it('reacts to viewport changes', () => {
		const mm = installMatchMedia(500);
		const h = harness();
		expect(h.bp.value).toBe('xs');
		mm.setWidth(1300);
		expect(h.bp.value).toBe('xl');
	});

	it("defaults to '2xl' when matchMedia is unavailable (SSR-safe)", () => {
		// no installMatchMedia → window.matchMedia is undefined
		expect(harness().bp.value).toBe('2xl');
	});

	it('honors options.ssrDefault when matchMedia is unavailable', () => {
		expect(harness({ ssrDefault: 'xs' }).bp.value).toBe('xs');
	});
});
