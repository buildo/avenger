export type Fetch<A, P> = (a: A) => Promise<P>

export interface TypedFetch<A, P> extends Fetch<A, P> {
  readonly a: A
  readonly p: P
}

export type AnyTypedFetch = TypedFetch<any, any>

export type TypedFetchMap = { [key: string]: AnyTypedFetch }

export type AMap<FS extends TypedFetchMap> = { [K in keyof FS]: FS[K]['a'] }

export type PMap<FS extends TypedFetchMap> = { [K in keyof FS]: FS[K]['p'] }

export interface Product<FS extends TypedFetchMap> extends TypedFetch<AMap<FS>, PMap<FS>> {
  readonly type: 'product',
  readonly fetches: FS
  readonly keys: Array<keyof FS>
  readonly toArray: (as: AMap<FS>) => Array<any>
  readonly fromArray: (ps: Array<any>) => PMap<FS>
}

type Ptoa<M extends AnyTypedFetch, S extends AnyTypedFetch> = (p: M['p'], a?: M['a']) => S['a']

export interface Composition<M extends AnyTypedFetch, S extends AnyTypedFetch> extends TypedFetch<M['a'], S['p']> {
  readonly type: 'composition',
  readonly master: M
  readonly ptoa: Ptoa<M, S>
  readonly slave: S
}

export function to<A, P>(fetch: Fetch<A, P>): TypedFetch<A, P> {
  return fetch as any
}

export function product<FS extends TypedFetchMap>(fetches: FS): Product<FS> {
  const keys: Array<keyof FS> = Object.keys(fetches)
  const toArray = (as: AMap<FS>) => keys.map(k => as[k])
  const fromArray = (ps: Array<any>): PMap<FS> => {
    const o: any = {}
    ps.forEach((p, i) => {
      o[keys[i]] = p
    })
    return o
  }

  const product = (as: AMap<FS>) => Promise.all(keys.map(k => fetches[k](as[k]))).then(fromArray)
  Object.assign(product, {
    type: 'product',
    fetches,
    keys,
    toArray,
    fromArray
  })
  return product as any
}

export function compose<M extends AnyTypedFetch, S extends AnyTypedFetch>(master: M, ptoa: Ptoa<M, S>, slave: S): Composition<M, S> {
  const composition: Ptoa<M, S> = a => master(a).then(p => slave(ptoa(p, a)))
  Object.assign(composition, {
    type: 'composition',
    master,
    ptoa,
    slave
  })
  return composition as any
}

/*
export type Star<A, P> =
  & TypedFetch<[A, A, A, A, A], [P, P, P, P, P]>
  & TypedFetch<[A, A, A, A], [P, P, P, P]>
  & TypedFetch<[A, A, A], [P, P, P]>
  & TypedFetch<[A, A], [P, P]>
  & TypedFetch<[A], [P]>


export function star<A, P>(fetch: Fetch<A, P>): Star<A, P> {
  const functions: { [key: number]: (as: Array<A>) => Promise<Array<P>> } = {}

  const star = (as: Array<A>) => {
    const len = as.length
    if (!functions.hasOwnProperty(len)) {
      const fetches = as.map(() => fetch)
      functions[len] = (as: Array<A>) => Promise.all(fetches.map((fetch, i) => fetch(as[i])))
    }
    return functions[len](as)
  }

  return star as any
}
*/
