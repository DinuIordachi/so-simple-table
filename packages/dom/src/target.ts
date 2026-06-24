/**
 * Resolves a mount target into a concrete `HTMLElement`.
 *
 * An element is returned as-is. A string is treated as a CSS selector and
 * looked up with `document.querySelector`.
 *
 * @param target - An existing element, or a CSS selector to resolve against the
 * current document.
 * @returns The resolved element.
 * @throws Error If `target` is a selector that matches no element in the
 * document.
 */
export function resolveTarget(target: string | HTMLElement): HTMLElement {
	if (typeof target !== 'string') {
		return target;
	}
	const el = document.querySelector(target);
	if (!el) {
		throw new Error(`[@sst/dom] target not found: ${target}`);
	}
	return el as HTMLElement;
}
