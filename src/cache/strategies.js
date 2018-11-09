import * as t from 'io-ts'
import { ThrowReporter } from 'io-ts/lib/ThrowReporter'

import {
  CacheValue
} from './Cache'

const Delay = t.number
const Nil = t.union([t.undefined, t.null])

// questa strategia esegue una fetch se non c'è un done oppure se il done presente è troppo vecchio
export class Expire {

  constructor(delay) {
    if (process.env.NODE_ENV !== 'production') {
      ThrowReporter.report(Delay.decode(delay))
    }
    this.delay = delay
  }

  isExpired(time) {
    if (process.env.NODE_ENV !== 'production') {
      ThrowReporter.report(t.number.decode(time))
    }

    const delta = new Date().getTime() - time
    // prendo in considerazione tempi futuri
    if (delta < 0) {
      return false
    }
    return delta >= this.delay
  }

  isAvailable(value) {
    if (process.env.NODE_ENV !== 'production') {
      ThrowReporter.report(CacheValue.decode(value))
    }
    return !Nil.is(value.done) && !this.isExpired(value.done.timestamp)
  }

  toString() {
    if (this.delay === -1) {
      return 'Refetch'
    }
    if (this.delay === Infinity) {
      return 'Available'
    }
    return `Expire(${this.delay})`
  }

}

// questa strategia esegue sempre la fetch a meno che non ce ne sia una ongoing
// e non restituisce mai un done
export const refetch = new Expire(-1)

// questa strategia esegue una fetch solo se non c'è né un done né un blocked
export const available = new Expire(Infinity)
