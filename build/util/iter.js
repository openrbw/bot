"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iter = void 0;
function iter(iterable) {
    return new IterUtil(iterable);
}
exports.iter = iter;
class IterUtil {
    iterable;
    constructor(iterable) {
        this.iterable = iterable;
    }
    *[Symbol.iterator]() {
        yield* this.iterable;
    }
    filter(predicate) {
        return new IterUtil(filter(predicate, this.iterable));
    }
    map(mapper) {
        return new IterUtil(map(mapper, this.iterable));
    }
    partition(predicate) {
        const [pass, fail] = [[], []];
        for (const item of this.iterable) {
            if (predicate(item))
                pass.push(item);
            else
                fail.push(item);
        }
        return [pass, fail];
    }
    flatMap(mapper) {
        const iterable = this.iterable;
        const flatMap = function* () {
            for (const item of iterable) {
                yield* mapper(item);
            }
        };
        return new IterUtil(flatMap());
    }
    take(count) {
        return new IterUtil(take(count, this.iterable));
    }
    skip(count) {
        return new IterUtil(skip(count, this.iterable));
    }
    groupBy(key) {
        return new IterUtil(groupBy(key, this.iterable));
    }
    toArray() {
        return [...this.iterable];
    }
    reduce(reducer, start) {
        let current = start;
        for (const item of this.iterable) {
            current = reducer(current, item);
        }
        return current;
    }
    tap(fn) {
        for (const item of this.iterable) {
            fn(item);
        }
        return this;
    }
    forEach(fn) {
        for (const item of this.iterable) {
            fn(item);
        }
    }
    extract(array, mapper) {
        for (const item of this.iterable) {
            array.push(mapper(item));
        }
        return this;
    }
    chunk(size) {
        const iterable = this.iterable;
        const chunk = function* () {
            const chunk = [];
            for (const item of iterable) {
                chunk.push(item);
                if (chunk.length === size)
                    yield chunk.splice(0, chunk.length);
            }
            if (chunk.length > 0)
                yield chunk;
        };
        return new IterUtil(chunk());
    }
    size() {
        let count = 0;
        for (const _ of this.iterable) {
            ++count;
        }
        return count;
    }
}
function* groupBy(fn, iterable) {
    const grouped = new Map();
    for (const item of iterable) {
        const key = fn(item);
        if (grouped.has(key)) {
            grouped.get(key).push(item);
        }
        else {
            grouped.set(key, [item]);
        }
    }
    yield* grouped.values();
}
function* filter(fn, iterable) {
    for (const item of iterable) {
        if (fn(item))
            yield item;
    }
}
function* map(fn, iterable) {
    let index = 0;
    for (const item of iterable) {
        yield fn(item, index++);
    }
}
function* take(count, iterable) {
    let i = count;
    if (i === 0)
        return;
    for (const item of iterable) {
        yield item;
        if (--i === 0)
            return;
    }
}
function* skip(count, iterable) {
    let i = count;
    for (const item of iterable) {
        if (i-- > 0)
            continue;
        yield item;
    }
}
