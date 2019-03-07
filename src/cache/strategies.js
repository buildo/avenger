// questa strategia esegue una fetch se non c'è un done oppure se il done presente è troppo vecchio
export class Expire {

  constructor(delay) {
    this.delay = delay
  }

  isExpired(time) {
    const delta = new Date().getTime() - time
    // prendo in considerazione tempi futuri
    if (delta < 0) {
      return false
    }
    return delta >= this.delay
  }

  isAvailable(value) {
    // eslint-disable-next-line eqeqeq
    return value.done != null && !this.isExpired(value.done.timestamp)
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
