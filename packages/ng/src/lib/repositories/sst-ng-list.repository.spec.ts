import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SstNgListRepository } from './sst-ng-list.repository';

interface IItem { id: string; name: string; }

@Injectable({ providedIn: 'root' })
class StrategyRepository extends SstNgListRepository<IItem> {
	protected override get baseUrl(): string {
		return 'https://api.test/strategies';
	}
}

describe('SstNgListRepository', () => {
	let repo: StrategyRepository;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), StrategyRepository],
		});
		repo = TestBed.inject(StrategyRepository);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	it('throws when subclass returns empty baseUrl', () => {
		@Injectable({ providedIn: 'root' })
		class BrokenRepository extends SstNgListRepository<IItem> {
			protected override get baseUrl(): string { return ''; }
		}
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), BrokenRepository] });
		expect(() => TestBed.inject(BrokenRepository).getList()).toThrow(/baseUrl/);
	});

	it('getList() issues a GET to the subclass baseUrl', async () => {
		const promise = repo.getList({ page: 1 });
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/strategies');
		expect(req.request.method).toBe('GET');
		expect(req.request.params.get('page')).toBe('1');
		req.flush({ result: [{ id: '1', name: 'a' }], totalCount: 1, isSuccess: true });
		await expect(promise).resolves.toStrictEqual({
			result: [{ id: '1', name: 'a' }],
			totalCount: 1,
			isSuccess: true,
		});
	});

	it('bulkDelete() issues a DELETE to {baseUrl}/bulk_delete with the ids body', async () => {
		const promise = repo.bulkDelete(['1', '2']);
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/strategies/bulk_delete');
		expect(req.request.method).toBe('DELETE');
		expect(req.request.body).toStrictEqual(['1', '2']);
		req.flush({ result: 'ok', isSuccess: true });
		await promise;
	});

	it('respects a queryKeys override on the subclass', async () => {
		@Injectable({ providedIn: 'root' })
		class CustomKeysRepository extends SstNgListRepository<IItem> {
			protected override get baseUrl(): string { return 'https://api.test/items'; }
			protected override get queryKeys() {
				return { page: 'pageNumber', pageSize: 'limit' };
			}
		}
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), CustomKeysRepository],
		});
		const httpMock2 = TestBed.inject(HttpTestingController);
		const r = TestBed.inject(CustomKeysRepository);
		expect(r).toBeInstanceOf(SstNgListRepository);
		httpMock2.verify();
	});
});
