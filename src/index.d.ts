import * as t from "io-ts";
import { Strategy } from "./cache/strategies";
import { ObjectOverwrite } from "typelevel-ts";

export * from "./cache/strategies";

type BROKEN_FlattenObject<O extends {}> = { [k in keyof O]: O[k] }[keyof O];

export interface QueryReturn<A, P> {
  _A: A;
  _P: P;
}

export type QueryFetch<A, P> = (a: A) => Promise<P>;

type IOTSParams = { [k: string]: t.Type<any, any> };

type IOTSDictToType<O extends IOTSParams> = { [k in keyof O]: t.TypeOf<O[k]> };

export type Dependencies = { [k: string]: QueryReturn<any, any> };
type DepA<D extends Dependencies> = BROKEN_FlattenObject<
  { [k in keyof D]: D[k]["_A"] }
>;

export type QueryArgs<A extends IOTSParams, P, D> = {
  fetch: D extends Dependencies
    ? QueryFetch<IOTSDictToType<A> & { [k in keyof D]: D[k]["_P"] }, P>
    : QueryFetch<IOTSDictToType<A>, P>;
  debugId?: string;
  cacheStrategy?: Strategy;
  params?: A;
  dependencies?: D;
};

export function Query<A extends IOTSParams, P>(
  args: QueryArgs<A, P, undefined>
): QueryReturn<IOTSDictToType<A>, P>;

export function Query<A extends IOTSParams, P, D extends Dependencies>(
  args: QueryArgs<A, P, D>
): QueryReturn<IOTSDictToType<A> & DepA<D>, P>;

export type CommandRun<A, P> = (a: A) => Promise<P>;

export interface CommandReturn<A, P> {
  _A: A;
  _P: P;
}

export type Invalidates = { [k: string]: QueryReturn<any, any> };

type InvA<I extends Invalidates> = BROKEN_FlattenObject<
  { [k in keyof I]: I[k]["_A"] }
>;

export type CommandArgs<A extends IOTSParams, I, D, R> = {
  run: I extends Invalidates
    ? D extends Dependencies
      ? CommandRun<
          IOTSDictToType<A> &
            { [k in keyof I]: I[k]["_A"] } &
            { [k in keyof D]: D[k]["_P"] },
          R
        >
      : CommandRun<IOTSDictToType<A> & { [k in keyof I]: I[k]["_A"] }, R>
    : D extends Dependencies
      ? CommandRun<IOTSDictToType<A> & { [k in keyof D]: D[k]["_P"] }, R>
      : CommandRun<IOTSDictToType<A>, R>;
  params?: A;
  invalidates?: I;
  dependencies?: D;
};

export function Command<A extends IOTSParams, R>(
  args: CommandArgs<A, undefined, undefined, R>
): CommandReturn<IOTSDictToType<A>, R>;

export function Command<A extends IOTSParams, R, I extends Invalidates>(
  args: CommandArgs<A, I, undefined, R>
): CommandReturn<IOTSDictToType<A> & InvA<I>, R>;

export function Command<A extends IOTSParams, R, D extends Dependencies>(
  args: CommandArgs<A, undefined, D, R>
): CommandReturn<IOTSDictToType<A> & DepA<D>, R>;

export function Command<A extends IOTSParams, R, I extends Invalidates, D extends Dependencies>(
  args: CommandArgs<A, I, D, R>
): CommandReturn<IOTSDictToType<A> & DepA<D> & InvA<I>, R>;

export type Queries = { [k: string]: QueryReturn<any, any> };
export type Commands = { [k: string]: CommandReturn<any, any> };

type FlatParams<Q extends Queries> = BROKEN_FlattenObject<
  { [k in keyof Q]: Q[k]["_A"] }
>;

export function query<Q extends Queries>(
  queryNodes: Q,
  flatParams: FlatParams<Q>
): any;
export function runCommand<R, C extends CommandReturn<any, R>>(
  command: C,
  flatParams: C["_A"]
): Promise<R>;
export function invalidate<Q extends Queries>(
  queryNodes: Q,
  flatParams: FlatParams<Q>
): void;
