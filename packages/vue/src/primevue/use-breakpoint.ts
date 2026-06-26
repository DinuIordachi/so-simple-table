import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { BREAKPOINT_MIN_WIDTH, BREAKPOINT_ORDER, type BreakpointToken } from './responsive';

/**
 * Reactive current Tailwind viewport breakpoint, driven by `window.matchMedia`.
 *
 * SSR / pre-mount / no `window`: resolves to the largest token (`'2xl'`) so the
 * most-desktop path renders; the real value lands on mount. Media-query
 * listeners are removed on unmount. Call only from a component `setup()`.
 */
export function useBreakpoint(): Ref<BreakpointToken> {
	const LARGEST = BREAKPOINT_ORDER[BREAKPOINT_ORDER.length - 1]!; // '2xl'
	const current = ref<BreakpointToken>(LARGEST);

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
