/** Tailwind viewport breakpoint tokens, ascending. `xs` is the base (< sm). */
export type BreakpointToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Breakpoint at/above which the DataTable renders; `'none'` ⇒ never render the table. */
export type TableBreakpoint = Exclude<BreakpointToken, 'xs'> | 'none';

/** Breakpoint tokens in ascending min-width order. */
export const BREAKPOINT_ORDER: readonly BreakpointToken[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

/** Min-width (px) for each breakpoint, mirroring Tailwind's defaults. */
export const BREAKPOINT_MIN_WIDTH: Readonly<Record<BreakpointToken, number>> = {
	xs: 0,
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536,
};

/** Layout-slot names consumed by `SstDataTable` (never forwarded to the DataTable). */
export const RESERVED_LAYOUT_SLOTS: ReadonlySet<string> = new Set<string>(BREAKPOINT_ORDER);

/** Rank in ascending order; `'none'` ranks above every real breakpoint. */
function rank(token: BreakpointToken | 'none'): number {
	return token === 'none' ? BREAKPOINT_ORDER.length : BREAKPOINT_ORDER.indexOf(token);
}

/**
 * Resolve which layout slot to render for the current viewport, or `null` to
 * render the DataTable.
 *
 * Mobile-first cascade: below `tableBreakpoint`, the largest defined slot whose
 * breakpoint ≤ the current breakpoint wins. If none applies, fall back to the
 * table (`null`). Slots at or above `tableBreakpoint` never render.
 */
export function resolveLayoutSlot(opts: {
	definedSlots: ReadonlySet<string>;
	current: BreakpointToken;
	tableBreakpoint: TableBreakpoint;
}): BreakpointToken | null {
	const { definedSlots, current, tableBreakpoint } = opts;
	const tableRank = rank(tableBreakpoint);
	if (rank(current) >= tableRank) return null; // table owns this range

	let best: BreakpointToken | null = null;
	for (const token of BREAKPOINT_ORDER) {
		const r = rank(token);
		if (r >= tableRank) break; // slots at/above the table range never render
		if (r <= rank(current) && definedSlots.has(token)) best = token;
	}
	return best; // null ⇒ no slot applies ⇒ table fallback
}
