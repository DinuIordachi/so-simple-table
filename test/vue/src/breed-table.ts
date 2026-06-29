import { defineTable } from '@bridgebyte/sst-vue';

export interface IBreed {
	id: string;
	name: string;
	description: string;
	hypoallergenic: boolean;
	lifeMin: number;
	lifeMax: number;
}

interface IDogApiResponse {
	data: ReadonlyArray<{
		id: string;
		type: 'breed';
		attributes: {
			name: string;
			description: string;
			hypoallergenic: boolean;
			life: { min: number; max: number };
		};
	}>;
	meta: { pagination: { records: number } };
}

export const useBreedTable = defineTable<IBreed, IDogApiResponse>({
	baseUrl: 'https://dogapi.dog/api/v2/breeds',
	queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
	sortMap: {}, // dogapi doesn't support sort
	initialPagination: { page: 1, pageSize: 10 },
	mapResponse: (raw) => ({
		result: raw.data.map((b) => ({
			id: b.id,
			name: b.attributes.name,
			description: b.attributes.description,
			hypoallergenic: b.attributes.hypoallergenic,
			lifeMin: b.attributes.life.min,
			lifeMax: b.attributes.life.max,
		})),
		totalCount: raw.meta.pagination.records,
		isSuccess: true,
	}),
});
