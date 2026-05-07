import { Injectable } from '@angular/core';
import type { IResponse } from '@sst/core';
import { SstNgSelectRepository } from './sst-ng-select.repository';

@Injectable()
export abstract class SstNgRepository<T> extends SstNgSelectRepository<T> {
	public create(dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.post<IResponse<unknown>>(this.requireBaseUrl(), { body: dto });
	}

	public update(id: string, dto: object): Promise<IResponse<unknown>> {
		return this.httpClient.put<IResponse<unknown>>(`${this.requireBaseUrl()}/${id}`, { body: dto });
	}

	public delete(id?: string): Promise<IResponse<unknown>> {
		const url = id !== undefined ? `${this.requireBaseUrl()}/${id}` : this.requireBaseUrl();
		return this.httpClient.delete<IResponse<unknown>>(url);
	}

	public duplicate(id: string): Promise<IResponse<string>> {
		return this.httpClient.post<IResponse<string>>(`${this.requireBaseUrl()}/${id}/duplication`, { body: {} });
	}
}
