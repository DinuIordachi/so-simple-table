export function arrayToMap<T, K extends keyof T>(items: readonly T[], key: K): Record<string, T> {
	const out: Record<string, T> = {};
	for (const item of items) {
		out[String(item[key])] = item;
	}
	return out;
}
