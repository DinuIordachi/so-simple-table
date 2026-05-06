export type Listener<T> = (value: T, previous: T) => void;
export type Unsubscribe = () => void;

export interface ISubscribeOptions {
	readonly emitOnSubscribe?: boolean;
}

export interface IReadonlyObservable<T> {
	get(): T;
	subscribe(listener: Listener<T>, options?: ISubscribeOptions): Unsubscribe;
}

export class Observable<T> implements IReadonlyObservable<T> {
	private _value: T;
	private readonly _listeners = new Set<Listener<T>>();

	public constructor(initial: T) {
		this._value = initial;
	}

	public get(): T {
		return this._value;
	}

	public set(next: T): void {
		if (Object.is(this._value, next)) {
			return;
		}
		const prev = this._value;
		this._value = next;
		// Snapshot listeners so unsubscribing during a notify does not skip subsequent ones.
		for (const listener of [...this._listeners]) {
			listener(next, prev);
		}
	}

	public subscribe(listener: Listener<T>, options: ISubscribeOptions = {}): Unsubscribe {
		this._listeners.add(listener);
		if (options.emitOnSubscribe ?? true) {
			listener(this._value, this._value);
		}
		return () => {
			this._listeners.delete(listener);
		};
	}

	public asReadonly(): IReadonlyObservable<T> {
		return {
			get: () => this._value,
			subscribe: (listener, options) => this.subscribe(listener, options),
		};
	}
}
