export interface Done<P> {
  /** il valore contenuto nella promise */
  readonly value: P,
  /** il momento in cui è stato valorizzato done */
  readonly timestamp: number,
  /** la promise che conteneva il done */
  readonly promise: Promise<P>
}

export interface CacheValue<P> {
  done?: Done<P>,
  blocked?: Promise<P>
}

export interface Strategy {
  isAvailable<P>(value: CacheValue<P>): boolean
}

// questa strategia esegue una fetch se non c'è un done oppure se il done presente è troppo vecchio
export class Expire {

  constructor(public delay: number) {}

  isExpired(time: number) {
    const delta = new Date().getTime() - time
    // prendo in considerazione tempi futuri
    if (delta < 0) {
      return false
    }
    return delta >= this.delay
  }

  isAvailable<P>(value: CacheValue<P>): value is { done: Done<P> } {
    return typeof value.done !== 'undefined' && !this.isExpired(value.done.timestamp)
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
