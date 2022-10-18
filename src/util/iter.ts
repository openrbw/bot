export type TypedFunction<T, R> = (item: T) => R;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedMultiArgFunction<T, R> = T extends Array<any>
	? (...args: T) => R
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
	private iterable: Iterable<T>;

	constructor(iterable: Iterable<T>) {
		this.iterable = iterable;
	}

	public *[Symbol.iterator]() {
		yield* this.iterable;
	}

	/** Filters out elements that do not pass the predicate */
	public filter<S extends T>(predicate: (value: T) => value is S): IterUtil<S>;
	public filter(predicate: TypedFunction<T, boolean>): IterUtil<T>;
	public filter(predicate: TypedFunction<T, boolean>) {
		return new IterUtil<T>(filter<T, Iterable<T>>(predicate, this.iterable));
	}

	/** Maps each element to another one */
	public map<R>(mapper: TypedMultiArgFunction<[item: T, index: number], R>) {
		return new IterUtil<R>(map(mapper, this.iterable));
	}

	/** Returns each item with an index based on the partition */
	public partition(predicate: TypedFunction<T, boolean>) {
		const [pass, fail]: [T[], T[]] = [[], []];

		for (const item of this.iterable) {
			if (predicate(item)) pass.push(item);
			else fail.push(item);
		}

		return [pass, fail] as const;
	}

	/** Flattens the returned array and maps it out */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public flatMap<R extends Iterable<any>, V extends ExtractIterableValue<R>>(
		mapper: TypedFunction<T, R>,
	) {
		const iterable = this.iterable;
		const flatMap = function* () {
			for (const item of iterable) {
				yield* mapper(item);
			}
		};

		return new IterUtil<V>(flatMap());
	}

	/** Takes up to the first `count` items from the iterable */
	public take(count: number) {
		return new IterUtil<T>(take(count, this.iterable));
	}

	/** Skips the first `count` items from the iterable */
	public skip(count: number) {
		return new IterUtil<T>(skip(count, this.iterable));
	}

	/** Creates a new iterable that iterates over an array of each group */
	public groupBy<V extends number | string>(key: TypedFunction<T, V>) {
		return new IterUtil<T[]>(groupBy(key, this.iterable));
	}

	/** Collects all iterable elements into an array */
	public toArray() {
		return [...this.iterable];
	}

	/** Reduces the iterable into a single value */
	public reduce<R>(reducer: TypedMultiArgFunction<[R, T], R>, start: R) {
		let current = start;

		for (const item of this.iterable) {
			current = reducer(current, item);
		}

		return current;
	}

	/** Executes a function for each element in the iterable and returns the iterable */
	public tap(fn: TypedFunction<T, unknown>) {
		for (const item of this.iterable) {
			fn(item);
		}

		return this;
	}

	/** Executes a function for each element in the iterable */
	public forEach(fn: TypedFunction<T, unknown>) {
		for (const item of this.iterable) {
			fn(item);
		}
	}

	public extract<R>(array: R[], mapper: TypedFunction<T, R>) {
		for (const item of this.iterable) {
			array.push(mapper(item));
		}

		return this;
	}

	/** Returns the number of elements in the iterable */
	public size() {
		let count = 0;

		for (const _ of this.iterable) {
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
	fn: TypedMultiArgFunction<[item: T, index: number], R>,
	iterable: I,
) {
	let index = 0;

	for (const item of iterable) {
		yield fn(item, index++);
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

function* skip<T, I extends Iterable<T>>(count: number, iterable: I) {
	let i = count;

	for (const item of iterable) {
		if (i-- > 0) continue;
		yield item;
	}
}
