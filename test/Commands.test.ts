import * as assert from 'assert'
import 'rxjs'

// import { none, some } from 'fp-ts/lib/Option'
import {
  Command,
  Leaf,
  available,
  Commands
} from '../src'

describe('Command', () => {

  it('should merge arguments', () => {
    const commandFetch = (a: { foo: string }) => Promise.resolve(undefined)

    const fetch1 = (a: { a1: string }) => Promise.resolve({ p1: 2 * a.a1.length })
    const leaf1 = new Leaf(fetch1, available)

    const fetch2 = (a: { a2: number }) => Promise.resolve({ p2: a.a2 > 0 })
    const leaf2 = new Leaf(fetch2, available)

    const command = Command.create(commandFetch, [leaf1, leaf2])

    return command.run({ foo: 'bar', a1: 'baz', a2: 1 }).then(
      () => assert.ok(true)
    )
  })

  it.skip('should invalidate caches', () => {
    assert.ok(false)
  })

})

describe('Commands', () => {

  it('should merge arguments', () => {
    const commandFetch1 = (a: { foo: string }) => Promise.resolve(undefined)

    const fetch1 = (a: { a1: string }) => Promise.resolve({ p1: 2 * a.a1.length })
    const leaf1 = new Leaf(fetch1, available)

    const commandFetch2 = (a: { bar: number }) => Promise.resolve(undefined)

    const fetch2 = (a: { a2: number }) => Promise.resolve({ p2: a.a2 > 0 })
    const leaf2 = new Leaf(fetch2, available)

    const command1 = Command.create(commandFetch1, [leaf1])
    const command2 = Command.create(commandFetch2, [leaf2])

    const commands = Commands.create([command1, command2])

    return commands.run({ foo: 'bar', a1: 'baz', bar: 2, a2: 1 }).then(
      () => assert.ok(true)
    )
  })

})
