import { SelectRepository } from './select.repository';
import type { IResponse } from '../types/response';

export abstract class Repository<T> extends SelectRepository<T> {
	public abstract create(dto: object): Promise<IResponse<unknown>>;
	public abstract update(id: string, dto: object): Promise<IResponse<unknown>>;
	public abstract delete(id?: string): Promise<IResponse<unknown>>;
	public abstract duplicate(id: string): Promise<IResponse<string>>;
}
