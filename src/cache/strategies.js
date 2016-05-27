import t from 'tcomb'

import {
  CacheValue
} from './Cache'

export const Strategy = t.interface({
  isAvailable: t.Function
}, 'Strategy')

const PositiveInfinity = t.irreducible('PositiveInfinity', x => x === Infinity)
const Delay = t.union([t.Number, PositiveInfinity], 'Delay')

// questa strategia esegue una fetch se non c'è un done oppure se il done presente è troppo vecchio
export class Expire {

  constructor(delay) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(Delay.is(delay), () => `Invalid argument delay supplied to Expire constructor (expected a Delay)`)
    }
    this.delay = delay
  }

  isExpired(time) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(t.Number.is(time), () => `Invalid argument time supplied to isExpired (expected a number)`)
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
      t.assert(CacheValue.is(value), () => `Invalid argument value supplied to isAvailable (expected a CacheValue)`)
    }
    return !t.Nil.is(value.done) && !this.isExpired(value.done.timestamp)
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
