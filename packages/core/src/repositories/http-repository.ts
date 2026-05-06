import { HttpSelectRepository } from './http-select.repository';
import { Repository } from './repository';
import type { IResponse } from '../types/response';

export class HttpRepository<T> extends HttpSelectRepository<T> implements Repository<T> {
	public create(dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.post<IResponse<unknown>>(this.baseUrl, { body: dto });
	}

	public update(id: string, dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.put<IResponse<unknown>>(`${this.baseUrl}/${id}`, { body: dto });
	}

	public delete(id?: string): Promise<IResponse<unknown>> {
		const url = id !== undefined ? `${this.baseUrl}/${id}` : this.baseUrl;
		return this.httpClient.delete<IResponse<unknown>>(url);
	}

	public duplicate(id: string): Promise<IResponse<string>> {
		return this.httpClient.post<IResponse<string>>(`${this.baseUrl}/${id}/duplication`, { body: {} });
	}
}
