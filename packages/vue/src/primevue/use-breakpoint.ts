import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { BREAKPOINT_MIN_WIDTH, BREAKPOINT_ORDER, type BreakpointToken } from './responsive';

/**
 * Reactive current Tailwind viewport breakpoint, driven by `window.matchMedia`.
 *
 * SSR / pre-mount / no `window`: resolves to `options.ssrDefault` (default the
 * largest token, `'2xl'`, so the most-desktop path renders); the real value lands
 * on mount. Pass `ssrDefault: 'xs'` to server-render the mobile path instead and
 * avoid a desktop→mobile hydration swap. Media-query listeners are removed on
 * unmount. Call only from a component `setup()`.
 *
 * @param options.ssrDefault - Breakpoint assumed before mount / during SSR.
 */
export function useBreakpoint(options: { ssrDefault?: BreakpointToken } = {}): Ref<BreakpointToken> {
	const fallback = options.ssrDefault ?? BREAKPOINT_ORDER[BREAKPOINT_ORDER.length - 1]!; // '2xl'
	const current = ref<BreakpointToken>(fallback);

	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return current; // SSR / unsupported: keep the desktop default
	}

	// One min-width query per breakpoint above the base (`xs` has no query).
	const queries = BREAKPOINT_ORDER.filter((token) => BREAKPOINT_MIN_WIDTH[token] > 0).map((token) => ({
		token,
		mql: window.matchMedia(`(min-width: ${BREAKPOINT_MIN_WIDTH[token]}px)`),
	}));

	const compute = (): void => {
		let active: BreakpointToken = 'xs';
		for (const { token, mql } of queries) {
			if (mql.matches) active = token; // ascending order ⇒ largest match wins
		}
		current.value = active;
	};

	onMounted(() => {
		for (const { mql } of queries) mql.addEventListener('change', compute);
		compute();
	});

	onBeforeUnmount(() => {
		for (const { mql } of queries) mql.removeEventListener('change', compute);
	});

	return current;
}
