/**
 * A single error entry returned within a failed {@link IResponse}.
 */
export interface IResponseError {
	/** Machine-readable error code. */
	readonly errorCode: string;
	/** Human-readable error description. */
	readonly message: string;
	/** Optional originating exception type, when surfaced by the backend. */
	readonly exceptionType?: string;
}

/**
 * Canonical envelope wrapping a single result returned by a repository.
 *
 * @typeParam T - Type of the wrapped {@link IResponse.result} payload.
 */
export interface IResponse<T> {
	/** The operation's payload. */
	readonly result: T;
	/** Whether the operation succeeded. */
	readonly isSuccess: boolean;
	/** Errors describing why the operation failed, when unsuccessful. */
	readonly errors?: readonly IResponseError[];
	/** Optional top-level status message. */
	readonly message?: string;
}

/**
 * {@link IResponse} variant for paginated list endpoints.
 *
 * @typeParam T - Type of the wrapped result (typically an array of rows).
 */
export interface IResponseList<T> extends IResponse<T> {
	/** Total number of rows matching the query across all pages. */
	readonly totalCount: number;
}
