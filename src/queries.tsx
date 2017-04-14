import * as React from 'react'
import { Queries, CacheEvent } from './index'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/debounceTime'
import shallowEqual from './shallowEqual'

export function queries<A, P extends Array<CacheEvent<any>>, WP>
  (queries: Queries<A, P>, Component: React.ComponentClass<WP>):
    <OP>(f: (events: P, ownProps: OP) => WP) => React.ComponentClass<OP & A> {

  return function<OP>(f: (events: P, ownProps: OP) => WP) {
    return class QueriesWrapper extends React.Component<OP & A, WP> {
      static displayName = `QueriesWrapper(${Component.displayName})`
      private subscription?: Subscription
      constructor(props: OP & A) {
        super(props)
        this.state = f(queries.getCacheEvents(props), props)
      }
      componentDidMount() {
        this.subscribe(this.props as any)
      }
      componentWillUnmount() {
        this.unsubscribe()
      }
      componentWillReceiveProps(nextProps: OP & A) {
        if (!shallowEqual(this.props, nextProps)) {
          this.subscribe(nextProps)
        }
      }
      render() {
        return <Component {...this.state} />
      }
      private subscribe(props: OP & A) {
        if (this.subscription) {
          this.subscription.unsubscribe()
        }
        this.subscription = queries.observe(props)
          .debounceTime(5)
          .subscribe(events => this.setState(f(events, props)))
      }
      private unsubscribe() {
        if (this.subscription) {
          this.subscription.unsubscribe()
        }
      }
    }
  }
}
