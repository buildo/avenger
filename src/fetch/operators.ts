export type Fetch<A, P> = (a: A) => Promise<P>

export interface TypedFetch<A, P> extends Fetch<A, P> {
  readonly a: A
  readonly p: P
}

export type TypedFetchMap = { [key: string]: TypedFetch<any, any> }

export type AMap<FS extends TypedFetchMap> = { [K in keyof FS]: FS[K]['a'] }

export type PMap<FS extends TypedFetchMap> = { [K in keyof FS]: FS[K]['p'] }

export interface Product<FS extends TypedFetchMap> extends TypedFetch<AMap<FS>, PMap<FS>> {
  readonly type: 'product',
  readonly fetches: FS
  readonly keys: Array<keyof FS>
  readonly toArray: (as: AMap<FS>) => Array<any>
  readonly fromArray: (ps: Array<any>) => PMap<FS>
}

export interface Composition<M extends Fetch<A1, P1>, S extends Fetch<A2, P2>, A1, P1, A2, P2> extends TypedFetch<A1, P2> {
  readonly type: 'composition',
  readonly master: M
  readonly ptoa: (p1: P1, a?: A1) => A2
  readonly slave: S
}

// TODO more overloadings
export type Star<A, P> =
  & TypedFetch<[A, A, A, A, A], [P, P, P, P, P]>
  & TypedFetch<[A, A, A, A], [P, P, P, P]>
  & TypedFetch<[A, A, A], [P, P, P]>
  & TypedFetch<[A, A], [P, P]>
  & TypedFetch<[A], [P]>

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

export function compose<A1, P1, A2, P2>(master: Fetch<A1, P1>, ptoa: (p1: P1, a?: A1) => A2, slave: Fetch<A2, P2>): Composition<typeof master, typeof slave, A1, P1, A2, P2> {
  const composition = (a: A1) => master(a).then(p => slave(ptoa(p, a)))
  Object.assign(composition, {
    type: 'composition',
    master,
    ptoa,
    slave
  })
  return composition as any
}

// TODO: tests
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

