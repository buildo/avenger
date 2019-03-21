import * as t from "io-ts";
import { Strategy } from "../cache/strategies";

type ObjectOverwrite<A extends object, B extends object> = Pick<
  A,
  Exclude<keyof A, keyof B>
> &
  B;

type UnionToIntersection<U> = (U extends any
  ? (k: U) => void
  : never) extends ((k: infer I) => void)
  ? I
  : never;

export type FlattenObject<O extends {}> = UnionToIntersection<O[keyof O]>;

export interface QueryReturn<A, P> {
  _tag: "QueryReturn";
  _A: A;
  _P: P;
}

export type QueryFetch<A, P> = (a: A) => Promise<P>;

type IOTSParams = { [k: string]: t.Type<any, any, any> };

type IOTSDictToType<O extends IOTSParams> = { [k in keyof O]: t.TypeOf<O[k]> };

export type QueryArgsNoDeps<A extends IOTSParams, P> = {
  id: string;
  cacheStrategy?: Strategy;
  params: A;
  fetch: QueryFetch<IOTSDictToType<A>, P>;
  dependencies?: never;
};

export type Dependencies = { [k: string]: { query: QueryReturn<any, any> } };
type DepA<D extends Dependencies> = FlattenObject<
  { [k in keyof D]: D[k]["query"]["_A"] }
>;
type DepP<D extends Dependencies> = { [k in keyof D]: D[k]["query"]["_P"] };

export type QueryArgs<
  A extends IOTSParams,
  P,
  D extends Dependencies
> = ObjectOverwrite<
  QueryArgsNoDeps<A, P>,
  {
    fetch: QueryFetch<IOTSDictToType<A> & DepP<D>, P>;
    dependencies: D;
  }
>;

export function Query<A extends IOTSParams, P>(
  args: QueryArgsNoDeps<A, P>
): QueryReturn<IOTSDictToType<A>, P>;

export function Query<A extends IOTSParams, P, D extends Dependencies>(
  args: QueryArgs<A, P, D>
): QueryReturn<IOTSDictToType<A> & DepA<D>, P>;

export type CommandRun<A, P> = (a: A) => Promise<P>;

export interface CommandReturn<A, P> {
  _tag: "CommandReturn";
  _A: A;
  _P: P;
}

export type CommandArgsNoInvs<A extends IOTSParams, R> = {
  id: string;
  params: A;
  run: CommandRun<IOTSDictToType<A>, R>;
  invalidates?: never;
};

export type Invalidates = { [k: string]: QueryReturn<any, any> };

type InvA<I extends Invalidates> = FlattenObject<
  { [k in keyof I]: I[k]["_A"] }
>;

export type CommandArgs<
  A extends IOTSParams,
  I extends Invalidates,
  R
> = ObjectOverwrite<
  CommandArgsNoInvs<A, R>,
  {
    run: CommandRun<IOTSDictToType<A> & InvA<I>, R>;
    invalidates: I;
  }
>;

export function Command<A extends IOTSParams, R>(
  args: CommandArgsNoInvs<A, R>
): CommandReturn<IOTSDictToType<A>, R>;

export function Command<A extends IOTSParams, R, I extends Invalidates>(
  args: CommandArgs<A, I, R>
): CommandReturn<IOTSDictToType<A> & InvA<I>, R>;

export type Queries = { [k: string]: QueryReturn<any, any> };
export type Commands = { [k: string]: CommandReturn<any, any> };

type FlatParams<Q extends Queries> = FlattenObject<
  { [k in keyof Q]: Q[k]["_A"] }
>;

export function make(graph: Queries): Queries;

export function query<Q extends Queries>(
  queryNodes: Q,
  flatParams: FlatParams<Q>
): unknown;

export function runCommand<R, C extends CommandReturn<any, R>>(
  graph: Queries,
  command: C,
  flatParams: C["_A"]
): Promise<R>;

export function invalidate<Q extends Queries>(
  graph: Queries,
  queryNodes: Q,
  flatParams: FlatParams<Q>
): void;
