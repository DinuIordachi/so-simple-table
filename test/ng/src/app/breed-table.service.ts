import { Injectable, inject } from '@angular/core';
import { SstTableService } from '@sst/ng';
import { BreedRepository, type IBreed } from './breed.repository';

@Injectable()
export class BreedTableService extends SstTableService<IBreed> {
	public constructor() {
		super({
			repository: inject(BreedRepository),
			sortMap: {}, // dogapi doesn't support sort
			initialPagination: { page: 1, pageSize: 10 },
		});
	}
}
