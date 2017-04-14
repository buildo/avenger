import * as React from 'react'
import { Queries, CacheEvent } from './index'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/debounceTime'
import shallowEqual from './shallowEqual'

export function queries<A, P extends Array<CacheEvent<any>>, WP>
  (merge: Queries<A, P>, Component: React.ComponentClass<WP>):
    <OP>(f: (events: P, ownProps: OP) => WP) => React.ComponentClass<OP & A> {

  return function<OP>(f: (events: P, ownProps: OP) => WP) {
    return class QueriesWrapper extends React.Component<OP & A, WP> {
      static displayName = `QueriesWrapper(${Component.displayName})`
      private subscription?: Subscription
      constructor(props: OP & A) {
        super(props)
        this.state = f(merge.getCacheEvents(props), props)
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
        this.subscription = merge.observe(props)
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

// import {
//   ObservableFetchDictionary,
//   ObservableFetchesArguments,
//   ObservableFetchesCacheEvents
// } from 'avenger'
// import { container } from './container'

// function pickProps<OFD extends ObservableFetchDictionary, OP>(fetches: OFD, props: OP & ObservableFetchesArguments<OFD>): OP {
//   const out: any = {}
//   for (let k in props) {
//     if (!fetches.hasOwnProperty(k)) {
//       out[k] = props[k]
//     }
//   }
//   return out
// }

// export function queries<OFD extends ObservableFetchDictionary>(fetches: OFD): <OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) => React.ComponentClass<OP & ObservableFetchesArguments<OFD>> {
//   return function<OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) {
//     return container<OFD, OP & ObservableFetchesArguments<OFD>, OP & ObservableFetchesCacheEvents<OFD>>(
//       fetches,
//       Component,
//       (ownProps, cacheEvents) => Object.assign(pickProps(fetches, ownProps), cacheEvents)
//     )
//   }
// }

// export function queries<OFD extends ObservableFetchDictionary>(fetches: OFD): <OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) => React.ComponentClass<OP & ObservableFetchesArguments<OFD>> {
//   return function<OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) {
//     return class QueriesWrapper extends React.Component<OP & ObservableFetchesArguments<OFD>, ObservableFetchesCacheEvents<OFD>> {
//       subscription?: Subscription
//       constructor(props: OP & ObservableFetchesArguments<OFD>) {
//         super(props)
//         this.state = getInitialState(fetches)
//       }
//       componentDidMount() {
//         this.subscribe(this.props)
//       }
//       componentWillReceiveProps(newProps: Readonly<OP & ObservableFetchesArguments<OFD>>) {
//         this.subscribe(this.props)
//       }
//       render() {
//         return <Component {...pickProps(fetches, this.props)} {...this.state} />
//       }
//       private subscribe(props: Readonly<OP & ObservableFetchesArguments<OFD>>) {
//         if (this.subscription) {
//           this.subscription.unsubscribe()
//         }
//         this.subscription = sequence(fetches, props).subscribe(state => this.setState(state))
//       }
//     }
//   }
// }
