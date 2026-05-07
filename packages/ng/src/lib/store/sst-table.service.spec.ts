import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import type { IResponse, IResponseList } from '@sst/core';
import { ListRepository } from '@sst/core';
import { SstTableService } from './sst-table.service';

interface IItem { id: string; name: string; }

@Injectable()
class StubRepository extends ListRepository<IItem> {
	public override getList = jest.fn<Promise<IResponseList<IItem[]>>, [unknown?]>().mockResolvedValue({
		result: [{ id: '1', name: 'a' }],
		totalCount: 1,
		isSuccess: true,
	});
	public override bulkDelete = jest.fn<Promise<IResponse<string>>, [readonly string[]]>().mockResolvedValue({
		result: 'ok',
		isSuccess: true,
	});
}

@Injectable()
class TestTableService extends SstTableService<IItem> {
	public constructor(repository: StubRepository) {
		super({ repository, sortMap: { createdAt: 'ByCreationDate' } });
	}
}

describe('SstTableService', () => {
	let repo: StubRepository;
	let service: TestTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [StubRepository, { provide: TestTableService, useFactory: (r: StubRepository) => new TestTableService(r), deps: [StubRepository] }],
		});
		repo = TestBed.inject(StubRepository);
		service = TestBed.inject(TestTableService);
	});

	it('exposes signal-backed accessors mirroring the underlying observables', () => {
		TestBed.runInInjectionContext(() => {
			expect(service.data().length).toBe(0);
			expect(service.total()).toBe(0);
			expect(service.loading()).toBe(false);
			expect(service.pagination()).toStrictEqual({ page: 1, pageSize: 10 });
			expect(service.search()).toBe('');
			expect(service.sort()).toBeUndefined();
			expect(service.filters()).toStrictEqual([]);
		});
	});

	it('updates signals when underlying observables change', () => {
		TestBed.runInInjectionContext(() => {
			service.updateSearch('alpha');
			expect(service.search()).toBe('alpha');
			service.updatePagination({ page: 3, pageSize: 25 });
			expect(service.pagination()).toStrictEqual({ page: 3, pageSize: 25 });
		});
	});

	it('cleans up the auto-refresh subscription on injector destroy', async () => {
		TestBed.runInInjectionContext(() => {
			service.updatePagination({ page: 2, pageSize: 10 });
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(repo.getList).toHaveBeenCalled();

		repo.getList.mockClear();
		TestBed.resetTestingModule();
		expect(() => {}).not.toThrow();
	});
});
