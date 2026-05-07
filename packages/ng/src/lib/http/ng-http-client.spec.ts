import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgHttpClient } from './ng-http-client';

describe('NgHttpClient', () => {
	let client: NgHttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), NgHttpClient],
		});
		client = TestBed.inject(NgHttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => httpMock.verify());

	it('issues a GET with serialized scalar params', async () => {
		const promise = client.get<{ ok: boolean }>('https://api.test/items', {
			params: { page: 1, pageSize: 10 },
		});
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/items' && r.method === 'GET');
		expect(req.request.params.get('page')).toBe('1');
		expect(req.request.params.get('pageSize')).toBe('10');
		req.flush({ ok: true });
		await expect(promise).resolves.toEqual({ ok: true });
	});

	it('repeats array params per value', async () => {
		const promise = client.get('https://api.test/items', { params: { ids: ['a', 'b', 'c'] } });
		const req = httpMock.expectOne((r) => r.url === 'https://api.test/items');
		expect(req.request.params.getAll('ids')).toEqual(['a', 'b', 'c']);
		req.flush({});
		await promise;
	});

	it('omits undefined params', async () => {
		const promise = client.get('https://api.test/items', { params: { page: 1, search: undefined } });
		const req = httpMock.expectOne('https://api.test/items?page=1');
		req.flush({});
		await promise;
	});

	it('serializes a JSON body for POST', async () => {
		const promise = client.post('https://api.test/items', { body: { name: 'x' } });
		const req = httpMock.expectOne('https://api.test/items');
		expect(req.request.method).toBe('POST');
		expect(req.request.body).toStrictEqual({ name: 'x' });
		req.flush({});
		await promise;
	});

	it('serializes a JSON body for PUT', async () => {
		const promise = client.put('https://api.test/items/1', { body: { name: 'y' } });
		const req = httpMock.expectOne('https://api.test/items/1');
		expect(req.request.method).toBe('PUT');
		expect(req.request.body).toStrictEqual({ name: 'y' });
		req.flush({});
		await promise;
	});

	it('sends DELETE with body when provided', async () => {
		const promise = client.delete('https://api.test/items', { body: ['1', '2'] });
		const req = httpMock.expectOne('https://api.test/items');
		expect(req.request.method).toBe('DELETE');
		expect(req.request.body).toStrictEqual(['1', '2']);
		req.flush({});
		await promise;
	});

	it('rejects when the request errors', async () => {
		const promise = client.get('https://api.test/items');
		const req = httpMock.expectOne('https://api.test/items');
		req.flush({ message: 'nope' }, { status: 500, statusText: 'Server Error' });
		await expect(promise).rejects.toBeDefined();
	});
});
