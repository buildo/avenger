export function product(fetches) {
  function product(as) {
    return Promise.all(fetches.map((fetch, i) => fetch(as[i])))
  }

  product.type = 'product'
  product.fetches = fetches

  return product
}

export function compose(master, ptoa, slave) {
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
