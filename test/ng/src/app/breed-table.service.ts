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
			// JSON:API uses `page[number]` / `page[size]`. The repository carries the same
			// override but it lives on the repo for documentation; the actual query-string
			// formatting is performed by the TableStore via mapTableParams.
			queryKeys: { page: 'page[number]', pageSize: 'page[size]' },
		});
	}
}
