import { defineTable } from '@sst/vue';
import { DummyJsonClient } from './dummyjson-client';

export interface IProduct {
	id: string;
	title: string;
	brand: string;
	category: string;
	price: number;
	rating: number;
	stock: number;
}

interface IDummyJsonResponse {
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

export const useProductsTable = defineTable<IProduct, IDummyJsonResponse>({
	baseUrl: 'https://dummyjson.com/products',
	httpClient: new DummyJsonClient(),
	queryKeys: { pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'order', search: 'q' },
	sortMap: {
		title: 'title',
		brand: 'brand',
		category: 'category',
		price: 'price',
		rating: 'rating',
		stock: 'stock',
	},
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: (raw) => ({
		result: raw.products.map((p) => ({
			id: String(p.id),
			title: p.title,
			brand: p.brand ?? '—',
			category: p.category,
			price: p.price,
			rating: p.rating,
			stock: p.stock,
		})),
		totalCount: raw.total,
		isSuccess: true,
	}),
});
