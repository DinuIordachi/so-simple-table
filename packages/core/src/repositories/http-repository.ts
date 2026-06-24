import { HttpSelectRepository } from './http-select.repository';
import { Repository } from './repository';
import type { IResponse } from '../types';

/**
 * Full-CRUD HTTP repository: extends {@link HttpSelectRepository} with create,
 * update, delete, and duplicate operations against `baseUrl`.
 *
 * @remarks
 * The recommended entry point when the table needs to mutate rows, not just
 * read them. Pair it with {@link TableStore} for listing and a UI binding for
 * the rest.
 *
 * @typeParam T - Row type.
 *
 * @example
 * ```ts
 * const repo = new HttpRepository<User>({ baseUrl: 'https://api.example.com/users' });
 * const created = await repo.create({ name: 'Ada' });
 * await repo.update(created.result, { name: 'Ada Lovelace' });
 * await repo.delete('42');
 * ```
 */
export class HttpRepository<T> extends HttpSelectRepository<T> implements Repository<T> {
	/** Creates a row via `POST {baseUrl}` with `dto` as the body. */
	public create(dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.post<IResponse<unknown>>(this.baseUrl, { body: dto });
	}

	/** Updates a row via `PUT {baseUrl}/{id}` with `dto` as the body. */
	public update(id: string, dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.put<IResponse<unknown>>(`${this.baseUrl}/${id}`, { body: dto });
	}

	/** Deletes a row via `DELETE {baseUrl}/{id}`, or `DELETE {baseUrl}` when `id` is omitted. */
	public delete(id?: string): Promise<IResponse<unknown>> {
		const url = id !== undefined ? `${this.baseUrl}/${id}` : this.baseUrl;
		return this.httpClient.delete<IResponse<unknown>>(url);
	}

	/** Duplicates a row via `POST {baseUrl}/{id}/duplication`. */
	public duplicate(id: string): Promise<IResponse<string>> {
		return this.httpClient.post<IResponse<string>>(`${this.baseUrl}/${id}/duplication`, { body: {} });
	}
}
