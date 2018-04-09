import * as t from 'io-ts';
import { Strategy } from './cache/strategies';
import { ObjectOverwrite } from 'typelevel-ts';

export * from './cache/strategies';

type BROKEN_FlattenObject<O extends {}> = { [k in keyof O]: O[k] }[keyof O];

export interface QueryReturn<A, P> {
  _A: A,
  _P: P
}

export type QueryFetch<A, P> = (a: A) => Promise<P>;

type IOTSParams = { [k: string]: t.Type<any, any> }

type IOTSDictToType<O extends IOTSParams> = {[k in keyof O]: t.TypeOf<O[k]> };

export type QueryArgsNoDeps<
  A extends IOTSParams,
  P
  > = {
    debugId?: string,
    cacheStrategy?: Strategy,
    params: A,
    fetch: QueryFetch<IOTSDictToType<A>, P>,
    dependencies?: never
  };

export type Dependencies = { [k: string]: QueryReturn<any, any> };
type DepA<D extends Dependencies> = BROKEN_FlattenObject<{ [k in keyof D]: D[k]['_A'] }>;
type DepP<D extends Dependencies> = {[k in keyof D]: D[k]['_P']};

export type QueryArgs<
  A extends IOTSParams,
  P,
  D extends Dependencies
  > = ObjectOverwrite<QueryArgsNoDeps<A, P>, {
    fetch: QueryFetch<IOTSDictToType<A> & DepP<D>, P>,
    dependencies: D
  }>;

export function Query<A extends IOTSParams, P>(args: QueryArgsNoDeps<A, P>): QueryReturn<IOTSDictToType<A>, P>

export function Query<A extends IOTSParams, P, D extends Dependencies>(args: QueryArgs<A, P, D>): QueryReturn<IOTSDictToType<A> & DepA<D>, P>

export type CommandRun<A, P> = (a: A) => Promise<P>;

export interface CommandReturn<A, P> {
  _A: A,
  _P: P
}

export type CommandArgsNoInvsNoDeps<A extends IOTSParams, R> = {
  params: A,
  run: CommandRun<IOTSDictToType<A>, R>,
  invalidates?: never,
  dependencies?: never
};

export type Invalidates = { [k: string]: QueryReturn<any, any> };

type InvA<I extends Invalidates> = BROKEN_FlattenObject<{ [k in keyof I]: I[k]['_A'] }>;

export type CommandArgsNoDeps<A extends IOTSParams, I extends Invalidates, R> = (
  ObjectOverwrite<CommandArgsNoInvsNoDeps<A, R>, {
    run: CommandRun<IOTSDictToType<A> & InvA<I>, R>,
    invalidates: I
  }>
);

export type CommandArgsNoInvs<A extends IOTSParams, D extends Dependencies, R> = (
  ObjectOverwrite<CommandArgsNoInvsNoDeps<A, R>, {
    run: CommandRun<IOTSDictToType<A> & DepP<D>, R>,
    dependencies: D
  }>
);

export type CommandArgs<A extends IOTSParams, I extends Invalidates, D extends Dependencies, R> = (
  ObjectOverwrite<CommandArgsNoInvs<A, D, R>, {
    run: CommandRun<IOTSDictToType<A> & InvA<I> & DepP<D>, R>,
    invalidates: I
  }>
);

export function Command<A extends IOTSParams, R>(args: CommandArgsNoInvsNoDeps<A, R>): CommandReturn<IOTSDictToType<A>, R>;

export function Command<A extends IOTSParams, R, I extends Invalidates>(
  args: CommandArgsNoDeps<A, I, R>
): CommandReturn<IOTSDictToType<A> & InvA<I>, R>;

export function Command<A extends IOTSParams, R, D extends Dependencies>(
  args: CommandArgsNoInvs<A, D, R>
): CommandReturn<IOTSDictToType<A> & DepA<D>, R>;

export function Command<A extends IOTSParams, R, I extends Invalidates, D extends Dependencies>(
  args: CommandArgs<A, I, D, R>
): CommandReturn<IOTSDictToType<A> & InvA<I> & DepA<D>, R>;

export type Queries = { [k: string]: QueryReturn<any, any> }
export type Commands = { [k: string]: CommandReturn<any, any> };

type FlatParams<Q extends Queries> = BROKEN_FlattenObject<{ [k in keyof Q]: Q[k]['_A'] }>;

export function query<Q extends Queries>(queryNodes: Q, flatParams: FlatParams<Q>): any
export function runCommand<R, C extends CommandReturn<any, R>>(command: C, flatParams: C['_A']): Promise<R>
export function invalidate<Q extends Queries>(queryNodes: Q, flatParams: FlatParams<Q>): void
