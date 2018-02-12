import * as t from 'io-ts';
import { Strategy } from '../cache/strategies';
import { ObjectOverwrite } from 'typelevel-ts';

export type QueryReturn<A, P> = {
  _A: A,
  _P: P
};

export type QueryFetch<A, P> = (a: A) => Promise<P>;

type IOTSParams = { [k: string]: t.Type<any, any> }

type IOTSDictToType<O extends IOTSParams> = {[k in keyof O]: t.TypeOf<O[k]> };

export type QueryArgsNoDeps<
  A extends IOTSParams,
  P
  > = {
    id: string,
    cacheStrategy: Strategy,
    params: A,
    fetch: QueryFetch<IOTSDictToType<A>, P>,
    dependencies?: never
  };

export type Dependencies = { [k: string]: { query: QueryReturn<any, any> } };
type DepA<D extends Dependencies> = {[k in keyof D]: D[k]['query']['_A']}[keyof D];

export type QueryArgs<
  A extends IOTSParams,
  P,
  D extends Dependencies
  > = ObjectOverwrite<QueryArgsNoDeps<A, P>, {
    fetch: QueryFetch<IOTSDictToType<A> & {[k in keyof D]: D[k]['query']['_P']}, P>,
    dependencies: D
  }>;

export function Query<A extends IOTSParams, P>(args: QueryArgsNoDeps<A, P>): QueryReturn<IOTSDictToType<A>, P>
// TODO: probably a single overload is enough (e.g. with just D1)? TS seems to be magic here (see smarterAvenger.ts)
export function Query<A extends IOTSParams, P, D1 extends Dependencies>(args: QueryArgs<A, P, D1>): QueryReturn<IOTSDictToType<A> & DepA<D1>, P>

type Invalidations = Dependencies;
type InvA<I extends Invalidations> = DepA<I>;

type CommandRun<A extends {}, R = void> = (args: A) => Promise<R>;

type CommandArgs<A extends {}, R = void> = {
  id: string,
  params?: {[k in keyof A]: t.Type<any, any> },
  run: CommandRun<A, R>
};
type CommandArgsWithInvalidations<
  A extends {},
  I1 extends Invalidations = {},
  I2 extends Invalidations = {},
  I3 extends Invalidations = {},
  R = void
  > = CommandArgs<A & InvA<I1> & InvA<I2> & InvA<I3>, R> & {
    invalidates?: I1 & I2 & I3
  }

type CommandReturn<A extends {}, R = void> = CommandRun<A, R> & { _A: A, _R: R };

export function Command<A extends {}, R = void>(args: CommandArgs<A, R>): CommandReturn<A, R>
export function Command<A extends {},
  I1 extends Invalidations, R = void>(args: CommandArgsWithInvalidations<A, I1, {}, {}, R>): CommandReturn<A, R>
export function Command<A extends {},
  I1 extends Invalidations, I2 extends Invalidations, R = void>(args: CommandArgsWithInvalidations<A, I1, I2, {}, R>): CommandReturn<A, R>
export function Command<A extends {},
  I1 extends Invalidations, I2 extends Invalidations, I3 extends Invalidations, R = void>(args: CommandArgsWithInvalidations<A, I1, I2, I3, R>): CommandReturn<A, R>
