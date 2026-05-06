export interface IResponseError {
	readonly errorCode: string;
	readonly message: string;
	readonly exceptionType?: string;
}

export interface IResponse<T> {
	readonly result: T;
	readonly isSuccess: boolean;
	readonly errors?: readonly IResponseError[];
	readonly message?: string;
}

export interface IResponseList<T> extends IResponse<T> {
	readonly totalCount: number;
}
