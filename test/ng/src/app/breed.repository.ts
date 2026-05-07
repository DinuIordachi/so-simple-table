import { Injectable } from '@angular/core';
import { SstNgRepository, type IResponseList, type IRepositoryQueryKeys, type ResponseListMapper } from '@sst/ng';

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

@Injectable({ providedIn: 'root' })
export class BreedRepository extends SstNgRepository<IBreed> {
	protected override get baseUrl(): string {
		return 'https://dogapi.dog/api/v2/breeds';
	}

	protected override get queryKeys(): Partial<IRepositoryQueryKeys> {
		return { page: 'page[number]', pageSize: 'page[size]' };
	}

	protected override get responseListMapper(): ResponseListMapper<IBreed> {
		return (raw: unknown): IResponseList<IBreed[]> => {
			const r = raw as IDogApiResponse;
			const result: IBreed[] = r.data.map((b) => ({
				id: b.id,
				name: b.attributes.name,
				description: b.attributes.description,
				hypoallergenic: b.attributes.hypoallergenic,
				lifeMin: b.attributes.life.min,
				lifeMax: b.attributes.life.max,
			}));
			return { result, totalCount: r.meta.pagination.records, isSuccess: true };
		};
	}
}
