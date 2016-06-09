// @flow
import t from 'tcomb'

export type FetchT<A, P> = (a: A) => Promise<P>;

// export interface FetchT<A, P> {
//   (a: A): Promise<P>;
// }

type FetchesT = Array<FetchT>;

export function product(fetches: FetchesT): FetchT<Array<any>, Array<any>> {

  const len = fetches.length

  function product(as: Array<any>) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(as.length === len, () => `Invalid argument as ${t.stringify(as)} supplied to product fetch (expected an array of ${len})`);
    }
    return Promise.all(fetches.map((fetch, i) => fetch(as[i])))
  }

  product.type = 'product'
  product.fetches = fetches

  return product
}

export function compose<MA, MP, SA, SP>(master: FetchT<MA, MP>, ptoa: (p: MP, a?: MA) => SA, slave: FetchT<SA, SP>): FetchT<MA, SP> {

  function composition(a) {
    return master(a).then(p => slave(ptoa(p, a)))
  }

  composition.type = 'composition'
  composition.master = master
  composition.ptoa = ptoa
  composition.slave = slave

  return composition
}

export function star<A, P>(fetch: FetchT<A, P>): FetchT<Array<A>, Array<P>> {

  const functions = {}

  function fstar(as) {
    const len = as.length
    if (!functions.hasOwnProperty(len)) {
      functions[len] = product(as.map(() => fetch))
    }
    return functions[len](as)
  }

  fstar.type = 'star'
  fstar.fetch = fetch

  return fstar
}
