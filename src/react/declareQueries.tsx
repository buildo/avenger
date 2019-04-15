import * as React from 'react';
import { product } from '../Query';
import { QueryResult } from '../QueryResult';
import { ComponentType } from 'react';
import { useQuery } from './useQuery';
import { filterWithKey } from 'fp-ts/lib/Record';
import {
  EnforceNonEmptyRecord,
  Omit,
  ObservableQueries,
  ProductA,
  Simplify
} from '../util';

type InputProps<R extends ObservableQueries> = ProductA<R>;

type OutputProps<R extends ObservableQueries> = Simplify<
  {
    [K in keyof R]: QueryResult<
      { [K in keyof R]: R[K]['_L'] }[keyof R],
      R[K]['_P']
    >
  }
>;

type DeclareQueriesReturn<R extends ObservableQueries> = {
  Props: OutputProps<R>;
  <P extends OutputProps<R>>(C: ComponentType<P>): ComponentType<
    Omit<P, keyof OutputProps<R>> & InputProps<R>
  >;
};

export function declareQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>
): DeclareQueriesReturn<R> {
  return (<P extends OutputProps<R>>(
    C: ComponentType<P>
  ): ComponentType<
    Omit<P, keyof OutputProps<R>> & InputProps<R>
  > => inputProps => {
    const queryResults = useQuery(product(queries), inputProps);
    const outputProps: P = {
      ...filterWithKey(inputProps, k => !(k in queries)),
      ...queryResults
    } as any;
    return <C {...outputProps} />;
  }) as any;
}
