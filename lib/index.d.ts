import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/scan';
import { Option } from 'fp-ts/lib/Option';
export declare type Fetch<A, P> = (a: A) => Promise<P>;
export declare class Done<P> {
    /** il valore restituito dalla promise contenuta nel campo `promise` una volta risolta */
    readonly value: P;
    /** il momento in cui è stato valorizzato value */
    readonly timestamp: number;
    /** la promise che conteneva il valore */
    readonly promise: Promise<P>;
    constructor(
        /** il valore restituito dalla promise contenuta nel campo `promise` una volta risolta */
        value: P, 
        /** il momento in cui è stato valorizzato value */
        timestamp: number, 
        /** la promise che conteneva il valore */
        promise: Promise<P>);
}
export declare class CacheValue<P> {
    readonly done: Option<Done<P>>;
    readonly promise: Option<Promise<P>>;
    static empty: CacheValue<any>;
    constructor(done: Option<Done<P>>, promise: Option<Promise<P>>);
}
export interface Strategy {
    isAvailable<P>(value: CacheValue<P>): boolean;
}
export declare class Expire {
    delay: number;
    constructor(delay: number);
    isExpired(time: number): boolean;
    isAvailable<P>(value: CacheValue<P>): boolean;
    toString(): string;
}
export declare const refetch: Expire;
export declare const available: Expire;
export declare type CacheOptions<A, P> = {
    name?: string;
    map?: Map<string, CacheValue<P>>;
    atok?: (x: A) => string;
};
export declare class Cache<A, P> {
    readonly name: string;
    readonly map: Map<string, CacheValue<P>>;
    readonly log: (s: string, ...args: Array<any>) => void;
    readonly atok: (x: A) => string;
    constructor(options?: CacheOptions<A, P>);
    private set(a, value);
    get(a: A): CacheValue<P>;
    delete(a: A): boolean;
    clear(): void;
    getAvailablePromise(a: A, strategy: Strategy): Promise<P> | undefined;
    getPromise(a: A, strategy: Strategy, fetch: Fetch<A, P>): Promise<P>;
    storeDone(a: A, done: Done<P>): void;
    storePromise(a: A, promise: Promise<P>): void;
}
export declare function cacheFetch<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: Cache<A, P>): Fetch<A, P>;
/** CacheEvent possiede un'istanza di
 * - Functor
 * - Setoid
 */
export declare class CacheEvent<P> {
    readonly loading: boolean;
    readonly data: Option<P>;
    constructor(loading: boolean, data: Option<P>);
    map<B>(f: (a: P) => B): CacheEvent<B>;
    equals(y: CacheEvent<P>): boolean;
}
export declare class ObservableCache<A, P> extends Cache<A, P> {
    readonly subjects: {
        [key: string]: BehaviorSubject<CacheEvent<P>>;
    };
    constructor(options?: CacheOptions<A, P>);
    getSubject(a: A): BehaviorSubject<CacheEvent<P>>;
    storeDone(a: A, done: Done<P>): void;
    storePromise(a: A, promise: Promise<P>): void;
    private emitLoadingEvent(a);
    private emitPayloadEvent(a, p);
}
export declare type Dependency<A, P> = {
    fetch: ObservableFetch<any, any>;
    trigger: (p: P, a: A) => void;
};
export interface ObservableFetch<A, P> {
    _A: A;
    _P: P;
    run(a: A, omit?: ObservableFetch<any, any>): Promise<P>;
    addDependency(d: Dependency<A, P>): void;
    observe(a: A): Observable<CacheEvent<P>>;
    getCacheEvent(a: A): CacheEvent<P>;
    getPayload(a: A): Option<P>;
    hasObservers(a: A): boolean;
    invalidate(a: A): void;
}
export declare class BaseObservableFetch<A, P> {
    protected readonly fetch: Fetch<A, P>;
    _A: A;
    _P: P;
    private dependencies;
    constructor(fetch: Fetch<A, P>);
    run(a: A, omit?: ObservableFetch<any, any>): Promise<P>;
    addDependency(d: Dependency<A, P>): void;
}
export declare class Leaf<A, P> extends BaseObservableFetch<A, P> implements ObservableFetch<A, P> {
    private readonly cache;
    static create<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: ObservableCache<A, P>): Leaf<A, P>;
    private constructor(fetch, strategy, cache);
    observe(a: A): Observable<CacheEvent<P>>;
    getCacheEvent(a: A): CacheEvent<P>;
    getPayload(a: A): Option<P>;
    hasObservers(a: A): boolean;
    invalidate(a: A): void;
}
export declare class Composition<A1, P1, A2, P2> extends BaseObservableFetch<A1, P2> implements ObservableFetch<A1, P2> {
    private readonly master;
    private readonly ptoa;
    private readonly slave;
    static create<A1, P1, A2, P2>(master: ObservableFetch<A1, P1>, slave: ObservableFetch<A2, P2>): (ptoa: (p1: P1, a1: A1) => A2) => Composition<A1, P1, A2, P2>;
    private constructor(master, ptoa, slave);
    observe(a1: A1): Observable<CacheEvent<P2>>;
    getCacheEvent(a1: A1): CacheEvent<P2>;
    getPayload(a1: A1): Option<P2>;
    hasObservers(a1: A1): boolean;
    invalidate(a1: A1): void;
}
export declare class Product<A extends Array<any>, P extends Array<any>> extends BaseObservableFetch<A, P> implements ObservableFetch<A, P> {
    private readonly fetches;
    static create<A1, P1, A2, P2, A3, P3>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>, ObservableFetch<A3, P3>]): Product<[A1, A2, A3], [P1, P2, P3]>;
    static create<A1, P1, A2, P2>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>]): Product<[A1, A2], [P1, P2]>;
    private constructor(fetches);
    observe(a: A): Observable<CacheEvent<P>>;
    getCacheEvent(a: A): CacheEvent<P>;
    getPayload(a: A): Option<P>;
    hasObservers(a: A): boolean;
    invalidate(a: A): void;
}
export declare class Bimap<A1, P1, A2, P2> extends BaseObservableFetch<A2, P2> implements ObservableFetch<A2, P2> {
    private readonly observableFetch;
    private readonly a2toa1;
    private readonly p1top2;
    constructor(observableFetch: ObservableFetch<A1, P1>, a2toa1: (a1: A2) => A1, p1top2: (p1: P1) => P2);
    observe(a2: A2): Observable<CacheEvent<P2>>;
    getCacheEvent(a2: A2): CacheEvent<P2>;
    getPayload(a2: A2): Option<P2>;
    hasObservers(a2: A2): boolean;
    invalidate(a2: A2): void;
}
export declare type Dictionary = {
    [key: string]: any;
};
/** Concatenable observable fetch */
export declare type COF<A extends Dictionary, P extends Dictionary> = ObservableFetch<A, P>;
export declare type AnyCOF = COF<any, any>;
export declare class Merge<A extends Dictionary, P extends Array<CacheEvent<any>>> {
    private readonly fetches;
    _A: A;
    _P: P;
    static create<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF>(fetches: [F1, F2, F3]): Merge<F1['_A'] & F2['_A'] & F3['_A'], F1['_P'] & F2['_P'] & F3['_P']>;
    static create<F1 extends AnyCOF, F2 extends AnyCOF>(fetches: [F1, F2]): Merge<F1['_A'] & F2['_A'], [CacheEvent<F1['_P']>, CacheEvent<F2['_P']>]>;
    private constructor(fetches);
    observe(as: A): Observable<P>;
}
