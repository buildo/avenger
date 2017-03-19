export type Fetch<A, P> = (a: A) => Promise<P>

export interface TypedFetch<A, P> extends Fetch<A, P> {
  readonly a: A
  readonly p: P
}

export type AnyFetch = Fetch<any, any>

export interface Product<A, P, FS> extends TypedFetch<A, P> {
  readonly type: 'product',
  readonly fetches: FS
}

export interface Composition<M extends Fetch<A1, P1>, S extends Fetch<A2, P2>, A1, P1, A2, P2> extends TypedFetch<A1, P2> {
  readonly type: 'composition',
  readonly master: M
  readonly ptoa: (p1: P1, a?: A1) => A2
  readonly slave: S
}

// TODO more overloadings
export type StarFetch<A, P> =
  & TypedFetch<[A, A, A, A, A], [P, P, P, P, P]>
  & TypedFetch<[A, A, A, A], [P, P, P, P]>
  & TypedFetch<[A, A, A], [P, P, P]>
  & TypedFetch<[A, A], [P, P]>
  & TypedFetch<[A], [P]>

// export function to<A, P>(fetch: Fetch<A, P>): TypedFetch<A, P> {
//   return fetch as any
// }

// TODO more overloadings
export function product<A1, P1, A2, P2, A3, P3>(fetches: [Fetch<A1, P1>, Fetch<A2, P2>, Fetch<A3, P3>]): Product<[A1, A2, A3], [P1, P2, P3], typeof fetches>
export function product<A1, P1, A2, P2>(fetches: [Fetch<A1, P1>, Fetch<A2, P2>]): Product<[A1, A2], [P1, P2], typeof fetches>
export function product<F extends Array<AnyFetch>>(fetches: F): Product<Array<any>, Array<any>, F>
export function product<F extends Array<AnyFetch>>(fetches: F): Product<Array<any>, Array<any>, F> {
  const product: any = (as: Array<any>) => Promise.all(fetches.map((fetch, i) => fetch(as[i])))
  product.type = 'product'
  product.fetches = fetches
  return product
}

export function compose<A1, P1, A2, P2>(master: Fetch<A1, P1>, ptoa: (p1: P1, a?: A1) => A2, slave: Fetch<A2, P2>): Composition<typeof master, typeof slave, A1, P1, A2, P2> {
  const composition: any = (a: A1) => master(a).then(p => slave(ptoa(p, a)))
  composition.type = 'composition'
  composition.master = master
  composition.ptoa = ptoa
  composition.slave = slave
  return composition
}

// TODO: tests
export function star<A, P>(fetch: Fetch<A, P>): StarFetch<A, P> {
  const functions: any = {}

  function fstar(as: Array<A>) {
    const len = as.length
    if (!functions.hasOwnProperty(len)) {
      const fetches = as.map(() => fetch)
      functions[len] = (as: Array<A>) => Promise.all(fetches.map((fetch, i) => fetch(as[i])))
    }
    return functions[len](as)
  }

  return fstar as any
}

