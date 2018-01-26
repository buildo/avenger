declare module "avenger/lib/graph" {

  import { Strategy } from 'avenger/lib/cache/strategies';
  import * as t from 'io-ts';

  export type QueryReturn<A, P> = {
    _A: A,
    _P: P
  };

  export type QueryFetch<A, P> = (a: A) => Promise<P>;

  export type Dependencies = { [k: string]: QueryReturn<any, any> };

  type DepA<D extends Dependencies> = {[k in keyof D]: D[k]['_A']}[keyof D];

  export type QueryArgs<
    A extends { },
    P,
    D extends Dependencies
  > = {
    id: string,
    cacheStrategy: Strategy,
    returnType: t.Type<any, any>,
    params: { [k in keyof A]: t.Type<any, any> },
    dependencies ?: { [k in keyof D]: { query: D[k] } },
    fetch: QueryFetch < A & { [k in keyof D]: D[k]['_P'] }, P >
  };

  export function Query<A extends {}, P>(args: QueryArgs<A, P, {}>): QueryReturn<A, P>
  // TODO: probably a single overload is enough (e.g. with just D1)? TS seems to be magic here (see smarterAvenger.ts)
  export function Query<A extends {}, P, D1 extends Dependencies>(args: QueryArgs<A, P, D1>): QueryReturn<A & DepA<D1>, P>
  export function Query<A extends {}, P, D1 extends Dependencies, D2 extends Dependencies>(args: QueryArgs<A, P, D1 & D2>): QueryReturn<A & DepA<D1> & DepA<D2>, P>
  export function Query<A extends {}, P, D1 extends Dependencies, D2 extends Dependencies, D3 extends Dependencies>(args: QueryArgs<A, P, D1 & D2 & D3>): QueryReturn<A & DepA<D1> & DepA<D2> & DepA<D3>, P>

  type Invalidations = Dependencies;
  type InvA<I extends Invalidations> = DepA<I>;

  type CommandRun<A extends {}, R = void> = (args: A) => Promise<R>;

  type CommandArgs<A extends {}, R = void> = {
    id: string,
    params ?: { [k in keyof A]: t.Type<any, any> },
    run: CommandRun < A, R >
  };
  type CommandArgsWithInvalidations <
    A extends { },
    I1 extends Invalidations = {},
    I2 extends Invalidations = {},
    I3 extends Invalidations = {},
    R = void
  > = CommandArgs<A & InvA<I1> & InvA<I2> & InvA<I3>, R> & {
    invalidates ?: I1 & I2 & I3
  }

  type CommandReturn < A extends {}, R = void> = CommandRun<A, R> & { _A: A, _R: R };

  export function Command<A extends {}, R = void>(args: CommandArgs<A, R>): CommandReturn<A, R>
  export function Command<A extends {},
  I1 extends Invalidations, R = void> (args: CommandArgsWithInvalidations<A, I1, {}, {}, R>): CommandReturn < A, R >
  export function Command<A extends {},
  I1 extends Invalidations, I2 extends Invalidations, R = void> (args: CommandArgsWithInvalidations<A, I1, I2, {}, R>): CommandReturn < A, R >
  export function Command<A extends {},
  I1 extends Invalidations, I2 extends Invalidations, I3 extends Invalidations, R = void> (args: CommandArgsWithInvalidations<A, I1, I2, I3, R>): CommandReturn < A, R >
}
