/**
 * Indexes an array of items into a lookup keyed by one of their properties.
 *
 * @remarks
 * Each item's key value is coerced to a string via `String(...)`. When two
 * items share the same key, the later item wins.
 *
 * @typeParam T - Item type.
 * @typeParam K - Property of `T` whose value is used as the map key.
 * @param items - Items to index.
 * @param key - Property to key each item by.
 * @returns A record mapping the stringified key value to its item.
 */
export function arrayToMap<T, K extends keyof T>(items: readonly T[], key: K): Record<string, T> {
	const out: Record<string, T> = {};
	for (const item of items) {
		out[String(item[key])] = item;
	}
	return out;
}
