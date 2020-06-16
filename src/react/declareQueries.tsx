import * as React from 'react';
import * as QR from '../QueryResult';
import {
  ObservableQueries,
  EnforceNonEmptyRecord,
  ProductA,
  ProductL,
  ProductP
} from '../util';
import { keepQueryResultSemigroup } from './Semigroup';
import { Semigroup } from 'fp-ts/lib/Semigroup';
import { observable } from '../Observable';
import { observeShallow } from '../observe';
import { product } from '../Query';
import { Subscription } from 'rxjs';
import * as O from 'fp-ts/lib/Option';

type QueryInputProps_internal<A> = { queries: A };
type QueryInputProps<A> = A extends void ? {} : { queries: A };

type QueryOutputProps<L, P> = { queries: QR.QueryResult<L, P> };

type InputProps<Props, A> = Omit<Props, 'queries'> & QueryInputProps<A>;

export interface DeclareQueriesReturn<A, L, P> {
  <Props extends QueryOutputProps<L, P>>(
    component: React.ComponentType<Props>
  ): React.ComponentType<InputProps<Props, A>>;
  InputProps: QueryInputProps<A>;
  Props: QueryOutputProps<L, P>;
}

/**
 * A React HOC-factory to observe a record of `ObservableQueries`,
 * receiving input values via Props,
 * and passing the latest available `QueryResult` to the wrapped component
 * @param queries A record of observable queries to observe
 * @param resultSemigroup A semigroup used to aggregate `QueryResult`s
 * @returns A React component receiving query inputs via the `query` prop
 */
export function declareQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  resultSemigroup?: Semigroup<QR.QueryResult<ProductL<R>, ProductP<R>>>
): DeclareQueriesReturn<ProductA<R>, ProductL<R>, ProductP<R>> {
  const _resultSemigroup =
    resultSemigroup || keepQueryResultSemigroup<ProductL<R>, ProductP<R>>();
  return ((
    Component: React.ComponentType<QueryOutputProps<ProductL<R>, ProductP<R>>>
  ) =>
    class DeclareQueriesWrapper extends React.Component<
      QueryInputProps_internal<ProductA<R>>
    > {
      state: { result: QR.QueryResult<ProductL<R>, ProductP<R>> } = {
        result: QR.queryResultLoading
      };

      product = product(queries);

      subscription: O.Option<Subscription> = O.none;

      subscribe() {
        this.subscription = O.some(
          observable
            .map(observeShallow(this.product, this.props.queries), r =>
              _resultSemigroup.concat(this.state.result, r)
            )
            .subscribe(result => {
              this.setState({ result });
            })
        );
      }

      unsubscribe() {
        O.option.map(this.subscription, s => s.unsubscribe());
      }

      componentDidMount() {
        this.subscribe();
      }

      componentDidUpdate(prevProps: QueryInputProps_internal<ProductA<R>>) {
        if (
          !this.product.inputEq.equals(prevProps.queries, this.props.queries)
        ) {
          this.unsubscribe();
          this.subscribe();
        }
      }

      componentWillUnmount() {
        this.unsubscribe();
      }

      render() {
        const { queries: _, ...props } = this.props;
        return <Component {...props} queries={this.state.result} />;
      }
    }) as any;
}
