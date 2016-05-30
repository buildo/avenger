import t from 'tcomb'

export function product(fetches) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.list(t.Function).is(fetches), () => 'Invalid argument fetches supplied to operator product (expected an array of functions)')
  }

  const len = fetches.length

  function product(as: t.Array) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(as.length === len, () => 'Invalid argument supplied to product fetch (expected an array of ${len})')
    }
    return Promise.all(fetches.map((fetch, i) => fetch(as[i])))
  }

  product.type = 'product'
  product.fetches = fetches

  return product
}

export function compose(master, ptoa, slave) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(slave), () => 'Invalid argument slave supplied to operator compose (expected a function)')
    t.assert(t.Function.is(ptoa), () => 'Invalid argument ptoa supplied to operator compose (expected a function)')
    t.assert(t.Function.is(master), () => 'Invalid argument master supplied to operator compose (expected a function)')
  }

  function composition(a) {
    return master(a).then(p => slave(ptoa(p, a)))
  }

  composition.type = 'composition'
  composition.master = master
  composition.ptoa = ptoa
  composition.slave = slave

  return composition
}

export function star(fetch) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => 'Invalid argument fetch supplied to operator star (expected a function)')
  }

  const functions = {}

  function fstar(as) {
    const len = as.length
    if (!functions.hasOwnProperty(len)) {
      functions[len] = product(as.map(() => fetch))
    }
    return functions[len](as)
  }

  return fstar
}
