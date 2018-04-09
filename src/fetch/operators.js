import * as t from 'io-ts'
import { ThrowReporter } from 'io-ts/lib/ThrowReporter'

export function product(fetches) {
  if (process.env.NODE_ENV !== 'production') {
    ThrowReporter.report(t.array(t.Function).decode(fetches))
  }

  const len = fetches.length

  function product(as) {
    if (process.env.NODE_ENV !== 'production') {
      if (as.length !== len) {
        throw new Error(`Invalid argument supplied to product fetch (expected an array of ${len})`)
      }
    }
    return Promise.all(fetches.map((fetch, i) => fetch(as[i])))
  }

  product.type = 'product'
  product.fetches = fetches

  return product
}

export function compose(master, ptoa, slave) {
  if (process.env.NODE_ENV !== 'production') {
    ThrowReporter.report(t.Function.decode(slave))
    ThrowReporter.report(t.Function.decode(ptoa))
    ThrowReporter.report(t.Function.decode(master))
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
    ThrowReporter.report(t.Function.decode(fetch))
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
