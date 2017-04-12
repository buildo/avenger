"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var debug = require("debug");
var BehaviorSubject_1 = require("rxjs/BehaviorSubject");
var Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/combineLatest");
require("rxjs/add/observable/of");
require("rxjs/add/observable/merge");
require("rxjs/add/operator/filter");
require("rxjs/add/operator/switchMap");
require("rxjs/add/operator/map");
require("rxjs/add/operator/distinctUntilChanged");
require("rxjs/add/operator/scan");
var Option_1 = require("fp-ts/lib/Option");
var traversable = require("fp-ts/lib/Traversable");
var array = require("fp-ts/lib/Array");
var option = require("fp-ts/lib/Option");
var sequenceOptions = traversable.sequence(option, array);
var Done = (function () {
    function Done(
        /** il valore restituito dalla promise contenuta nel campo `promise` una volta risolta */
        value, 
        /** il momento in cui è stato valorizzato value */
        timestamp, 
        /** la promise che conteneva il valore */
        promise) {
        this.value = value;
        this.timestamp = timestamp;
        this.promise = promise;
    }
    return Done;
}());
exports.Done = Done;
var CacheValue = (function () {
    function CacheValue(done, promise) {
        this.done = done;
        this.promise = promise;
    }
    return CacheValue;
}());
CacheValue.empty = new CacheValue(Option_1.none, Option_1.none);
exports.CacheValue = CacheValue;
// questa strategia esegue una fetch se non c'è un done oppure se il done presente è scaduto
var Expire = (function () {
    function Expire(delay) {
        this.delay = delay;
    }
    Expire.prototype.isExpired = function (time) {
        var delta = new Date().getTime() - time;
        // prendo in considerazione tempi futuri
        if (delta < 0) {
            return false;
        }
        return delta >= this.delay;
    };
    Expire.prototype.isAvailable = function (value) {
        var _this = this;
        return value.done.fold(function () { return false; }, function (done) { return !_this.isExpired(done.timestamp); });
    };
    Expire.prototype.toString = function () {
        if (this.delay === -1) {
            return 'Refetch';
        }
        if (this.delay === Infinity) {
            return 'Available';
        }
        return "Expire(" + this.delay + ")";
    };
    return Expire;
}());
exports.Expire = Expire;
// questa strategia esegue sempre la fetch a meno che non ce ne sia una ongoing
// e non restituisce mai un done
exports.refetch = new Expire(-1);
// questa strategia esegue una fetch solo se non c'è né un done né un blocked
exports.available = new Expire(Infinity);
var Cache = (function () {
    function Cache(options) {
        if (options === void 0) { options = {}; }
        this.name = options.name || '<anonymous>';
        this.map = options.map || new Map();
        this.log = debug("avenger:" + this.name);
        this.atok = options.atok || JSON.stringify;
    }
    Cache.prototype.set = function (a, value) {
        var k = this.atok(a);
        this.log('set key `%s`', k);
        return this.map.set(k, value);
    };
    Cache.prototype.get = function (a) {
        return this.map.get(this.atok(a)) || CacheValue.empty;
    };
    Cache.prototype.delete = function (a) {
        var k = this.atok(a);
        this.log('delete key `%s`', k);
        return this.map.delete(k);
    };
    Cache.prototype.clear = function () {
        return this.map.clear();
    };
    Cache.prototype.getAvailablePromise = function (a, strategy) {
        var value = this.get(a);
        if (strategy.isAvailable(value) && Option_1.isSome(value.done)) {
            this.log('getAvailablePromise(%o, %s): returning available done %o', a, String(strategy), value.done);
            return value.done.value.promise;
        }
        if (Option_1.isSome(value.promise)) {
            this.log('getAvailablePromise(%o, %s): returning available promise', a, String(strategy));
            return value.promise.value;
        }
        this.log('getAvailablePromise(%o, %s): cache miss', a, String(strategy));
    };
    Cache.prototype.getPromise = function (a, strategy, fetch) {
        var availablePromise = this.getAvailablePromise(a, strategy);
        if (availablePromise) {
            return availablePromise;
        }
        this.log('getPromise(%o, %s): fetching and returning related promise', a, String(strategy));
        var promise = fetch(a);
        this.storePromise(a, promise);
        return promise;
    };
    Cache.prototype.storeDone = function (a, done) {
        var p = done.value, timestamp = done.timestamp, promise = done.promise;
        var blocked = this.get(a).promise;
        this.log('storing %o => %o (ts: %o)', a, p, timestamp);
        // se c'è una promise in flight la mantengo
        if (Option_1.isSome(blocked) && blocked.value !== promise) {
            this.set(a, new CacheValue(Option_1.some(done), blocked));
        }
        else {
            this.set(a, new CacheValue(Option_1.some(done), Option_1.none));
        }
    };
    Cache.prototype.storePromise = function (a, promise) {
        var _this = this;
        // quando la promise risolve immagazzino il nuovo payload
        promise.then(function (value) { return _this.storeDone(a, new Done(value, new Date().getTime(), promise)); });
        // immagazzino il nuovo valore mantenendo il payload presente
        var done = this.get(a).done;
        this.set(a, new CacheValue(done, Option_1.some(promise)));
    };
    return Cache;
}());
exports.Cache = Cache;
function cacheFetch(fetch, strategy, cache) {
    return function (a) { return cache.getPromise(a, strategy, fetch); };
}
exports.cacheFetch = cacheFetch;
/** CacheEvent possiede un'istanza di
 * - Functor
 * - Setoid
 */
var CacheEvent = (function () {
    function CacheEvent(loading, data) {
        this.loading = loading;
        this.data = data;
    }
    CacheEvent.prototype.map = function (f) {
        return new CacheEvent(this.loading, this.data.map(f));
    };
    CacheEvent.prototype.equals = function (y) {
        if (this === y) {
            return true;
        }
        if (this.loading === y.loading && this.data === y.data) {
            return true;
        }
        return false;
    };
    return CacheEvent;
}());
exports.CacheEvent = CacheEvent;
var LOADING = new CacheEvent(true, Option_1.none);
// INITIAL_LOADING, pur essendo identico come contenuto,
// deve avere una reference diversa da LOADING per poter essere
// distinguibile nella filter di observe
var INITIAL_LOADING = new CacheEvent(true, Option_1.none);
var ObservableCache = (function (_super) {
    __extends(ObservableCache, _super);
    function ObservableCache(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, options) || this;
        _this.subjects = {};
        return _this;
    }
    ObservableCache.prototype.getSubject = function (a) {
        var k = this.atok(a);
        if (!this.subjects.hasOwnProperty(k)) {
            this.log('creating ReplaySubject for %o', a);
            this.subjects[k] = new BehaviorSubject_1.BehaviorSubject(INITIAL_LOADING);
        }
        return this.subjects[k];
    };
    ObservableCache.prototype.storeDone = function (a, done) {
        _super.prototype.storeDone.call(this, a, done);
        this.emitPayloadEvent(a, done.value);
    };
    ObservableCache.prototype.storePromise = function (a, promise) {
        _super.prototype.storePromise.call(this, a, promise);
        this.emitLoadingEvent(a);
    };
    ObservableCache.prototype.emitLoadingEvent = function (a) {
        this.log('emitting LOADING event for %o', a);
        var subject = this.getSubject(a);
        if (Option_1.isSome(subject.value.data)) {
            subject.next(new CacheEvent(true, subject.value.data));
        }
        else {
            subject.next(LOADING);
        }
    };
    ObservableCache.prototype.emitPayloadEvent = function (a, p) {
        this.log('emitting PAYLOAD event for %o (payload: %o)', a, p);
        var subject = this.getSubject(a);
        subject.next(new CacheEvent(false, Option_1.some(p)));
    };
    return ObservableCache;
}(Cache));
exports.ObservableCache = ObservableCache;
var BaseObservableFetch = (function () {
    function BaseObservableFetch(fetch) {
        this.fetch = fetch;
        this.dependencies = [];
    }
    BaseObservableFetch.prototype.run = function (a, omit) {
        var _this = this;
        var promise = this.fetch(a);
        promise.then(function (p) {
            _this.dependencies.forEach(function (_a) {
                var fetch = _a.fetch, trigger = _a.trigger;
                if (fetch !== omit) {
                    trigger(p, a);
                }
            });
        });
        return promise;
    };
    BaseObservableFetch.prototype.addDependency = function (d) {
        if (this.dependencies.every(function (_a) {
            var fetch = _a.fetch;
            return fetch !== d.fetch;
        })) {
            this.dependencies.push(d);
        }
    };
    return BaseObservableFetch;
}());
exports.BaseObservableFetch = BaseObservableFetch;
var Leaf = (function (_super) {
    __extends(Leaf, _super);
    function Leaf(fetch, strategy, cache) {
        var _this = _super.call(this, cacheFetch(fetch, strategy, cache)) || this;
        _this.cache = cache;
        return _this;
    }
    Leaf.create = function (fetch, strategy, cache) {
        return new Leaf(fetch, strategy, cache || new ObservableCache());
    };
    Leaf.prototype.observe = function (a) {
        return this.cache.getSubject(a)
            .filter(function (e) { return e !== INITIAL_LOADING; })
            .distinctUntilChanged(function (x, y) { return x.equals(y); }); // TODO remove distinctUntilChanged?
    };
    Leaf.prototype.getCacheEvent = function (a) {
        return this.cache.getSubject(a).value;
    };
    Leaf.prototype.getPayload = function (a) {
        return this.cache.get(a).done.map(function (done) { return done.value; });
    };
    Leaf.prototype.hasObservers = function (a) {
        return this.cache.getSubject(a).observers.length > 0;
    };
    Leaf.prototype.invalidate = function (a) {
        this.cache.delete(a);
    };
    return Leaf;
}(BaseObservableFetch));
exports.Leaf = Leaf;
var Composition = (function (_super) {
    __extends(Composition, _super);
    function Composition(master, ptoa, slave) {
        var _this = _super.call(this, function (a1) { return _this.master.run(a1, _this.slave).then(function (p1) { return _this.slave.run(_this.ptoa(p1, a1)); }); }) || this;
        _this.master = master;
        _this.ptoa = ptoa;
        _this.slave = slave;
        master.addDependency({
            fetch: _this.slave,
            trigger: function (p1, a1) {
                var a2 = _this.ptoa(p1, a1);
                if (_this.slave.hasObservers(a2)) {
                    _this.slave.run(a2);
                }
            }
        });
        return _this;
    }
    Composition.create = function (master, slave) {
        return function (ptoa) { return new Composition(master, ptoa, slave); };
    };
    Composition.prototype.observe = function (a1) {
        var _this = this;
        return this.master.observe(a1)
            .switchMap(function (cep1) { return cep1.data.fold(function () { return Observable_1.Observable.of(LOADING); }, function (p1) { return _this.slave.observe(_this.ptoa(p1, a1)); }); })
            .distinctUntilChanged(function (x, y) { return x.equals(y); }); // TODO remove distinctUntilChanged?
    };
    Composition.prototype.getCacheEvent = function (a1) {
        var _this = this;
        return this.master.getCacheEvent(a1).data.fold(function () { return LOADING; }, function (p1) { return _this.slave.getCacheEvent(_this.ptoa(p1, a1)); });
    };
    Composition.prototype.getPayload = function (a1) {
        var _this = this;
        return this.master.getPayload(a1)
            .chain(function (p1) { return _this.slave.getPayload(_this.ptoa(p1, a1)); });
    };
    Composition.prototype.hasObservers = function (a1) {
        var _this = this;
        return this.master.getCacheEvent(a1).data.fold(function () { return false; }, function (p1) { return _this.slave.hasObservers(_this.ptoa(p1, a1)); });
    };
    Composition.prototype.invalidate = function (a1) {
        var _this = this;
        this.master.getPayload(a1).map(function (p1) {
            var a2 = _this.ptoa(p1, a1);
            _this.master.invalidate(a1);
            _this.slave.invalidate(a2);
        });
    };
    return Composition;
}(BaseObservableFetch));
exports.Composition = Composition;
var Product = (function (_super) {
    __extends(Product, _super);
    function Product(fetches) {
        var _this = _super.call(this, function (a) { return Promise.all(_this.fetches.map(function (fetch, i) { return fetch.run(a[i]); })); }) || this;
        _this.fetches = fetches;
        return _this;
    }
    Product.create = function (fetches) {
        return new Product(fetches);
    };
    Product.prototype.observe = function (a) {
        return Observable_1.Observable.combineLatest.apply(Observable_1.Observable, this.fetches.map(function (fetch, i) { return fetch.observe(a[i]); }).concat([function () {
                var values = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    values[_i] = arguments[_i];
                }
                var loading = values.some(function (v) { return v.loading === true; });
                if (values.every(function (v) { return Option_1.isSome(v.data); })) {
                    var os = values.map(function (v) { return v.data; });
                    var o = sequenceOptions(os);
                    return new CacheEvent(loading, o);
                }
                else {
                    return LOADING;
                }
            }])).distinctUntilChanged(function (x, y) { return x.equals(y); }); // TODO remove distinctUntilChanged?
    };
    Product.prototype.getCacheEvent = function (a) {
        var os = this.fetches.map(function (fetch, i) { return fetch.getCacheEvent(a[i]).data; });
        var o = sequenceOptions(os);
        return new CacheEvent(!Option_1.isSome(o), o);
    };
    Product.prototype.getPayload = function (a) {
        var os = this.fetches.map(function (fetch, i) { return fetch.getPayload(a[i]); });
        var o = sequenceOptions(os);
        return o;
    };
    Product.prototype.hasObservers = function (a) {
        return this.fetches.some(function (fetch, i) { return fetch.hasObservers(a[i]); });
    };
    Product.prototype.invalidate = function (a) {
        this.fetches.forEach(function (f, i) { return f.invalidate(a[i]); });
    };
    return Product;
}(BaseObservableFetch));
exports.Product = Product;
var Bimap = (function (_super) {
    __extends(Bimap, _super);
    function Bimap(observableFetch, a2toa1, p1top2) {
        var _this = _super.call(this, function (a2) { return observableFetch.run(a2toa1(a2)).then(function (p1) { return p1top2(p1); }); }) || this;
        _this.observableFetch = observableFetch;
        _this.a2toa1 = a2toa1;
        _this.p1top2 = p1top2;
        return _this;
    }
    Bimap.prototype.observe = function (a2) {
        var _this = this;
        return this.observableFetch.observe(this.a2toa1(a2)).map(function (cep1) { return cep1.map(_this.p1top2); });
    };
    Bimap.prototype.getCacheEvent = function (a2) {
        return this.observableFetch.getCacheEvent(this.a2toa1(a2)).map(this.p1top2);
    };
    Bimap.prototype.getPayload = function (a2) {
        return this.observableFetch.getPayload(this.a2toa1(a2)).map(this.p1top2);
    };
    Bimap.prototype.hasObservers = function (a2) {
        return this.observableFetch.hasObservers(this.a2toa1(a2));
    };
    Bimap.prototype.invalidate = function (a2) {
        this.observableFetch.invalidate(this.a2toa1(a2));
    };
    return Bimap;
}(BaseObservableFetch));
exports.Bimap = Bimap;
function observeAndRun(fetch, a) {
    var observable = fetch.observe(a);
    fetch.run(a);
    return observable;
}
var Merge = (function () {
    function Merge(fetches) {
        this.fetches = fetches;
    }
    Merge.create = function (fetches) {
        return new Merge(fetches);
    };
    Merge.prototype.observe = function (as) {
        var observables = this.fetches.map(function (fetch, i) { return observeAndRun(fetch, as).map(function (ce) { return ({ type: i, ce: ce }); }); });
        return Observable_1.Observable
            .merge.apply(Observable_1.Observable, observables).scan(function (acc, x) {
            if (acc[x.type].loading !== x.ce.loading) {
                var acc2 = acc.slice();
                acc2[x.type] = x.ce;
                return acc2;
            }
            return acc;
        }, this.fetches.map(function () { return LOADING; }))
            .distinctUntilChanged();
    };
    return Merge;
}());
exports.Merge = Merge;
// export class Merge<A, P> {
//   _A: A
//   _P: P
//   // TODO more overloadings
//   static create<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF>(fetches: [F1, F2, F3]): Merge<F1['_A'] & F2['_A'] & F3['_A'], F1['_P'] & F2['_P'] & F3['_P']>
//   static create<F1 extends AnyCOF, F2 extends AnyCOF>(fetches: [F1, F2]): Merge<F1['_A'] & F2['_A'], F1['_P'] & F2['_P']>
//   static create(fetches: Array<AnyCOF>): Merge<any, any> {
//     return new Merge(fetches)
//   }
//   private constructor(private readonly fetches: Array<AnyCOF>) {}
//   run(as: A): Observable<{ readonly [K in keyof P]?: P[K] }> {
//     const observables = this.fetches.map((fetch, i) => observeAndRun(fetch, as))
//     return Observable
//       .merge(...observables)
//       .filter(ce => !ce.loading)
//       .startWith({})
//       .scan((acc, ce: any) => {
//         return Object.assign({}, acc, ce.data.value)
//       })
//   }
// }
/*

// TODO more overloadings
export function concat<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF, F4 extends AnyCOF>(fetches: [F1, F2, F3, F4]): COF<F1['_A'] & F2['_A'] & F3['_A'] & F4['_A'], F1['_P'] & F2['_P'] & F3['_P'] & F4['_P']>
export function concat<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF>(fetches: [F1, F2, F3]): COF<F1['_A'] & F2['_A'] & F3['_A'], F1['_P'] & F2['_P'] & F3['_P']>
export function concat<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF>(fetches: [F1, F2, F3]): COF<F1['_A'] & F2['_A'] & F3['_A'], F1['_P'] & F2['_P'] & F3['_P']>
export function concat<F1 extends AnyCOF, F2 extends AnyCOF>(fetches: [F1, F2]): COF<F1['_A'] & F2['_A'], F1['_P'] & F2['_P']>
export function concat(fetches: Array<AnyCOF>): AnyCOF {
  // non c'è bisogno di fare un check sui conflitti perchè il tipo che ne risulta non è
  // utilizzabile a valle quindi verrà sollevato un errore appena si prova ad utilizzare
  // il risultato, a meno che tutti i tipi coincidano
  return new Bimap(
    Product.create(fetches as any),
    a2 => fetches.map(() => a2),
    ps => Object.assign.apply(null, [{}].concat(ps))
  )
}

import { identity } from 'fp-ts/lib/function'
import * as t from 'io-ts'

export type ObservableFetchDictionary = { [key: string]: AnyObservableFetch }

export type ObservableFetchesArguments<D extends ObservableFetchDictionary> = { readonly [K in keyof D]: D[K]['_A'] }

export type ObservableFetchesCacheEvents<D extends ObservableFetchDictionary> = { readonly [K in keyof D]: CacheEvent<D[K]['_P']> }

// Dato un dizionario di ObservableFetch restituisce un Observable del dizionario dei CacheEvent corrispondenti
export function sequence<D extends ObservableFetchDictionary>(fetches: D, as: ObservableFetchesArguments<D>): Observable<ObservableFetchesCacheEvents<D>> {
  const itok = Object.keys(fetches)
  const observables = itok.map(k => observeAndRun(fetches[k], as[k]))
  return Observable.combineLatest(...observables, (...values) => {
    const out: { [key: string]: CacheEvent<any> } = {}
    itok.forEach((k, i) => {
      out[k] = values[i]
    })
    return out as any
  })
}

// Dato un dizionario di ObservableFetch restituisce il dizionario dei CacheEvent corrispondenti
export function sequenceSync<D extends ObservableFetchDictionary>(fetches: D, as: ObservableFetchesArguments<D>): ObservableFetchesCacheEvents<D> {
  const out: { [key: string]: CacheEvent<any> } = {}
  for (let k in fetches) {
    out[k] = fetches[k].getCacheEvent(as[k])
  }
  return out as any
}

//
// DSL -> ObservableFetch
//

export type Queries = { [key: string]: Query<any, any, any> }

export interface Query<Params extends t.Props, Deps extends Queries, P> extends ObservableFetch<{ [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_A'] }, P> {
  params: Params,
  dependencies: Deps
}

// Data una configurazione appartenente al DSL restituisce la ObservableFetch corrispondente
export function Query<Params extends t.Props, Deps extends Queries, P>(options: {
  cacheStrategy: Strategy,
  params: Params,
  fetch: Fetch<{ [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }, P>,
  dependencies: Deps,
  atok?: (x: { [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }) => string
}): Query<Params, Deps, P>
export function Query<Params extends t.Props, P>(options: { // TODO togliere Params?
  cacheStrategy: Strategy,
  params: Params,
  fetch: Fetch<{ [K in keyof Params]: t.TypeOf<Params[K]> }, P>
}): Query<Params, {}, P>
export function Query<Params extends t.Props, Deps extends Queries, P>(options: {
  cacheStrategy: Strategy,
  params: Params,
  fetch: Fetch<{ [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }, P>,
  dependencies?: Deps,
  atok?: (x: { [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }) => string
}): Query<Params, Deps, P> {

  const dependencies: Deps = options.dependencies || ({} as Deps)
  const keys = Object.keys(dependencies)
  const keysLength = keys.length
  const leaf = Leaf.create(options.fetch, options.cacheStrategy, new ObservableCache<any, P>({ atok: options.atok }))

  const createQuery = () => {
    if (keysLength === 0) {
      return leaf
    } else {
      const fetches: ObservableFetch<any[], any[]>[] = keys.map(k => dependencies[k])
      const params = options.params
      const paramsLength = Object.keys(params).length
      if (paramsLength > 0) {
        const paramsFetch = Leaf.create(a => Promise.resolve(a), refetch, new ObservableCache<any, P>())
        fetches.push(paramsFetch)
      }
      const product = Product.create(fetches as any)
      const composition = Composition.create(
        product,
        leaf
      )((p: Array<any>) => {
        const a: { [key: string]: any } = {}
        keys.forEach((k, i) => {
          a[k] = p[i]
        })
        if (paramsLength > 0) {
          for (let k in params) {
            a[k] = p[keysLength][k]
          }
        }
        return a
      })
      const a2toa1 = (a2: any) => {
        const a1 = keys.map(k => a2[k])
        if (paramsLength > 0) {
          a1.push(a2)
        }
        return a1
      }
      return new Bimap(composition, a2toa1, identity)
    }
  }

  const out: any = createQuery()
  out.params = options.params
  out.dependencies = dependencies
  return out
}
*/
//# sourceMappingURL=index.js.map