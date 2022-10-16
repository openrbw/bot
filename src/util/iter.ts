// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedFunction<T, R> = (item: T) => R;
export type TypedMultiArgFunction<T, R> = T extends Array<infer V>
	? (...items: V[]) => R
	: never;
export type Pipeline<T, I extends Iterable<T>> = (
	iterable: I,
) => Generator<T, void, unknown>;

type ExtractIterableValue<I> = I extends Iterable<infer T> ? T : never;

export function iter<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	I extends Iterable<any>,
	T extends ExtractIterableValue<I>,
>(iterable: I) {
	return new IterUtil<T>(iterable);
}

class IterUtil<T> implements Iterable<T> {
	private iterator: Iterable<T>;

	constructor(iterator: Iterable<T>) {
		this.iterator = iterator;
	}

	public *[Symbol.iterator]() {
		yield* this.iterator;
	}

	/** Filters out elements that do not pass the predicate */
	public filter<S extends T>(predicate: (value: T) => value is S): IterUtil<S>;
	public filter(predicate: TypedFunction<T, boolean>): IterUtil<T>;
	public filter(predicate: TypedFunction<T, boolean>) {
		return new IterUtil<T>(filter<T, Iterable<T>>(predicate, this.iterator));
	}

	/** Maps each element to another one */
	public map<R>(mapper: TypedFunction<T, R>) {
		return new IterUtil<R>(map(mapper, this.iterator));
	}

	/** Flattens the returned array and maps it out */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public flatMap<R extends Iterable<any>, V extends ExtractIterableValue<R>>(
		mapper: TypedFunction<T, R>,
	) {
		const iterable = this.iterator;
		const flatMap = function* () {
			for (const item of iterable) {
				yield* mapper(item);
			}
		};

		return new IterUtil<V>(flatMap());
	}

	/** Takes up to the first `count` items from the iterator */
	public take(count: number) {
		return new IterUtil<T>(take(count, this.iterator));
	}

	/** Creates a new iterator that iterates over an array of each group */
	public groupBy<V extends number | string>(key: TypedFunction<T, V>) {
		return new IterUtil<T[]>(groupBy(key, this.iterator));
	}

	/** Collects all iterator elements into an array */
	public toArray() {
		return [...this.iterator];
	}

	/** Reduces the iterator into a single value */
	public reduce<R>(reducer: TypedMultiArgFunction<[R, T], R>, start: R) {
		let current = start;

		for (const item of this.iterator) {
			current = reducer(current, item);
		}

		return current;
	}

	/** Executes a function for each element in the iterator */
	public tap(fn: TypedFunction<T, unknown>) {
		for (const item of this.iterator) {
			fn(item);
		}

		return this;
	}

	public extract<R>(array: R[], mapper: TypedFunction<T, R>) {
		for (const item of this.iterator) {
			array.push(mapper(item));
		}

		return this;
	}

	/** Returns the number of elements in the iterator */
	public size() {
		let count = 0;

		for (const _ of this.iterator) {
			++count;
		}

		return count;
	}
}

function* groupBy<T, I extends Iterable<T>, V extends number | string>(
	fn: TypedFunction<T, V>,
	iterable: I,
) {
	const grouped = new Map<V, T[]>();

	for (const item of iterable) {
		const key = fn(item);

		if (grouped.has(key)) {
			grouped.get(key)!.push(item);
		} else {
			grouped.set(key, [item]);
		}
	}

	yield* grouped.values();
}

function* filter<T, I extends Iterable<T>>(
	fn: TypedFunction<T, boolean>,
	iterable: I,
) {
	for (const item of iterable) {
		if (fn(item)) yield item;
	}
}

function* map<T, R, I extends Iterable<T>>(
	fn: TypedFunction<T, R>,
	iterable: I,
) {
	for (const item of iterable) {
		yield fn(item);
	}
}

function* take<T, I extends Iterable<T>>(count: number, iterable: I) {
	let i = count;
	if (i === 0) return;

	for (const item of iterable) {
		yield item;

		if (--i === 0) return;
	}
}
