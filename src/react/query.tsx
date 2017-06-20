import * as React from 'react'
import { ObservableFetch, CacheEvent, observeAndRun } from '../index'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/debounceTime'
import shallowEqual from './shallowEqual'

export type Loading = () => JSX.Element

export function query<A, P, WP>(
  query: ObservableFetch<A, P>,
  Component: React.ComponentClass<WP>
): <OP>(f: (ownProps: OP, event: CacheEvent<P>) => WP) => React.ComponentClass<OP & A> {
  return function<OP>(f: (ownProps: OP, event: CacheEvent<P>) => WP) {
    return class QueryWrapper extends React.Component<OP & A, WP> {
      static displayName = `QueryWrapper(${Component.displayName})`
      private subscription?: Subscription
      constructor(props: OP & A) {
        super(props)
        this.state = f(props, query.getCacheEvent(props))
      }
      componentDidMount() {
        this.subscribe(this.props)
      }
      componentWillUnmount() {
        this.unsubscribe()
      }
      componentWillReceiveProps(nextProps: Readonly<OP & A>) {
        if (!shallowEqual(this.props, nextProps)) {
          this.subscribe(nextProps)
        }
      }
      render() {
        return <Component {...this.state as any} />
      }
      private subscribe(props: Readonly<OP & A>) {
        const _props: OP & A = props as any
        if (this.subscription) {
          this.subscription.unsubscribe()
        }
        try {
          this.subscription = observeAndRun<A, P>(query, _props)
            .debounceTime(5)
            .subscribe(event => this.setState(f(_props, event)))
        } catch (e) {
          console.error(e.message)
        }
      }
      private unsubscribe() {
        if (this.subscription) {
          this.subscription.unsubscribe()
        }
      }
    }
  }
}
