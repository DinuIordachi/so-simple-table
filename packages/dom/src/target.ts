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
