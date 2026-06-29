import type { IResponseList } from '@bridgebyte/sst-vue';

/** Canonical product row used across the examples. */
export interface IProduct {
	id: string;
	title: string;
	brand: string;
	category: string;
	price: number;
	rating: number;
	stock: number;
}

/** DummyJSON's list wire format. */
export interface IDummyResponse {
	products: ReadonlyArray<{
		id: number;
		title: string;
		brand?: string;
		category: string;
		price: number;
		rating: number;
		stock: number;
	}>;
	total: number;
}

export const DUMMY_BASE = 'https://dummyjson.com/products';

/** Query-key overrides that adapt DummyJSON's skip/limit + sortBy/order wire format. */
export const DUMMY_QUERY_KEYS = {
	page: 'skip',
	pageSize: 'limit',
	orderBy: 'sortBy',
	orderByDescending: 'order',
	search: 'q',
} as const;

/** Map one raw DummyJSON product to {@link IProduct}. */
export function toProduct(p: IDummyResponse['products'][number]): IProduct {
	return {
		id: String(p.id),
		title: p.title,
		brand: p.brand ?? '—',
		category: p.category,
		price: p.price,
		rating: p.rating,
		stock: p.stock,
	};
}

/** Map a raw DummyJSON list response to the canonical `IResponseList`. */
export function mapProducts(raw: IDummyResponse): IResponseList<IProduct[]> {
	return { result: raw.products.map(toProduct), totalCount: raw.total, isSuccess: true };
}
