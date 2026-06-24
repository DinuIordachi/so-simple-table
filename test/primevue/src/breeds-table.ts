import { defineTable } from '@sst/vue';

export interface IBreed {
	id: string;
	name: string;
	description: string;
	lifeMin: number;
	lifeMax: number;
}

interface IDogApiResponse {
	data: ReadonlyArray<{
		id: string;
		attributes: { name: string; description: string; life: { min: number; max: number } };
	}>;
	meta: { pagination: { records: number } };
}

export const useBreedsTable = defineTable<IBreed, IDogApiResponse>({
	baseUrl: 'https://dogapi.dog/api/v2/breeds',
	queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
	sortMap: {}, // dogapi doesn't support sort
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: (raw) => ({
		result: raw.data.map((b) => ({
			id: b.id,
			name: b.attributes.name,
			description: b.attributes.description,
			lifeMin: b.attributes.life.min,
			lifeMax: b.attributes.life.max,
		})),
		totalCount: raw.meta.pagination.records,
		isSuccess: true,
	}),
});
