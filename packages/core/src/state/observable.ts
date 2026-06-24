/**
 * Callback invoked when an observable's value changes.
 *
 * @param value - The new value.
 * @param previous - The value held before the change.
 */
export type Listener<T> = (value: T, previous: T) => void;

/** Function returned by `subscribe` that detaches the listener when called. */
export type Unsubscribe = () => void;

/**
 * Options controlling how a listener is attached.
 */
export interface ISubscribeOptions {
	/**
	 * Whether the listener is invoked immediately with the current value on
	 * subscribe. Defaults to `true`.
	 */
	readonly emitOnSubscribe?: boolean;
}

/**
 * Read-only view of an {@link Observable}: callers can read the current value
 * and subscribe to changes, but cannot mutate it.
 */
export interface IReadonlyObservable<T> {
	/** Returns the current value. */
	get(): T;
	/** Subscribes to value changes; returns an {@link Unsubscribe} function. */
	subscribe(listener: Listener<T>, options?: ISubscribeOptions): Unsubscribe;
}

/**
 * Minimal synchronous observable value with listener subscription.
 *
 * @remarks
 * Used throughout the store to expose reactive state. Notifications fire only
 * when the value changes by `Object.is` reference identity, so replace objects
 * and arrays rather than mutating them in place.
 *
 * @typeParam T - Type of the held value.
 *
 * @example
 * ```ts
 * const count = new Observable(0);
 * const off = count.subscribe((next, prev) => console.log(prev, '->', next));
 * count.set(1); // logs: 0 -> 1
 * off();
 * ```
 */
export class Observable<T> implements IReadonlyObservable<T> {
	private _value: T;
	private readonly _listeners = new Set<Listener<T>>();

	/**
	 * Creates an observable seeded with an initial value.
	 *
	 * @param initial - Value the observable starts with.
	 */
	public constructor(initial: T) {
		this._value = initial;
	}

	/** Returns the current value without subscribing. */
	public get(): T {
		return this._value;
	}

	/**
	 * Updates the value and notifies listeners.
	 *
	 * @remarks
	 * A no-op when `next` is `Object.is`-equal to the current value. Listeners
	 * are snapshotted before notifying so unsubscribing during a notification
	 * does not skip the remaining listeners.
	 */
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

	/**
	 * Registers a listener for future value changes.
	 *
	 * @param listener - Invoked on each change, and once immediately unless
	 * {@link ISubscribeOptions.emitOnSubscribe} is `false`.
	 * @returns A function that removes the listener.
	 */
	public subscribe(listener: Listener<T>, options: ISubscribeOptions = {}): Unsubscribe {
		this._listeners.add(listener);
		if (options.emitOnSubscribe ?? true) {
			listener(this._value, this._value);
		}
		return () => {
			this._listeners.delete(listener);
		};
	}

	/**
	 * Returns a read-only handle backed by this observable, hiding `set` while
	 * still reflecting live updates.
	 */
	public asReadonly(): IReadonlyObservable<T> {
		return {
			get: () => this._value,
			subscribe: (listener, options) => this.subscribe(listener, options),
		};
	}
}
