import * as t from 'io-ts'
import { ThrowReporter } from 'io-ts/lib/ThrowReporter'
import debug from 'debug'

const Done = t.interface({
  value: t.any,         // il valore contenuto nella promise
  timestamp: t.number,  // il momento in cui è stato valorizzato done
  promise: t.any        // la promise che conteneva il done
}, 'Done')

export const CacheValue = t.interface({
  done: t.union([Done, t.undefined]),
  blocked: t.any
}, 'CacheValue')

export const empty = Object.freeze({})

export class Cache {

  constructor(options = {}) {
    this.name = options.name || '<anonymous>'
    this.map = options.map || new Map()
    this.log = debug(`avenger:${this.name}`)
    this.atok = options.atok || JSON.stringify
  }

  get(a) {
    return this.map.get(this.atok(a)) || empty
  }

  set(a, value) {
    if (process.env.NODE_ENV !== 'production') {
      ThrowReporter.report(CacheValue.decode(value))
    }
    return this.map.set(this.atok(a), value)
  }

  delete(a) {
    this.log('delete(%o)', a)
    return this.map.delete(this.atok(a))
  }

  clear() {
    return this.map.clear()
  }

  getAvailablePromise(a, strategy) /* Maybe[Promise[P]] */ {
    const value = this.get(a)

    if (strategy.isAvailable(value)) {
      this.log('getAvailablePromise(%o, %s): returning available done %o', a, String(strategy), value.done)
      return value.done.promise
    }

    if (value.blocked) {
      this.log('getAvailablePromise(%o, %s): returning available promise', a, String(strategy))
      return value.blocked
    }

    this.log('getAvailablePromise(%o, %s): cache miss', a, String(strategy))

    return undefined
  }

  getPromise(a, strategy, fetch) /* Promise[P] */ {
    if (process.env.NODE_ENV !== 'production') {
      ThrowReporter.report(t.Function.decode(fetch))
    }

    const availablePromise = this.getAvailablePromise(a, strategy)
    if (availablePromise) {
      return availablePromise
    }

    this.log('getPromise(%o, %s): fetching and returning related promise', a, String(strategy))
    const promise = fetch(a)
    this.storePromise(a, promise)
    return promise
  }

  storePayload(a, p, promise) {
    const timestamp = new Date().getTime()

    const value = {
      done: {
        value: p,
        timestamp,
        promise
      }
    }

    // se c'è una promise in flight la mantengo
    const { blocked } = this.get(a)
    if (blocked !== promise) {
      value.blocked = blocked
    }

    this.log('storing %o => %o (ts: %o)', a, p, timestamp)
    this.set(a, value)
  }

  storePromise(a, promise) {
    promise.then(
      p => {
        // quando la promise risolve immagazzino il nuovo payload
        this.storePayload(a, p, promise)
      },
      err => {
        // quando viene rifiutata, pulisco il blocked, a meno che non sia già cambiato
        const value = this.get(a)
        if (value.blocked === promise) {
          delete value.blocked
          this.set(a, value);
        }
        // questa rejection sarebbe sempre unhandled
        // per il momento non facciamo fallire ma logghiamo soltanto, per render felice jest
        this.log('unhandled promise rejection', err)
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Unhandled promise rejection', err); // eslint-disable-line no-console
        }
      }
    )

    // immagazzino il nuovo valore mantenendo il payload presente
    const { done } = this.get(a)
    const value = { done, blocked: promise }
    this.set(a, value)
  }

}
