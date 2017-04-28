import * as React from 'react'
import { Option } from 'fp-ts/lib/Option'

export function loading<WP>(Component: React.ComponentClass<WP>, notReady: () => JSX.Element): <OP>(f: (ownProps: OP) => Option<WP>) => React.ComponentClass<OP> {
  return function <OP>(f: (ownProps: OP) => Option<WP>) {
    return class LoadingWrapper extends React.Component<OP, void> {
      static displayName = `LoadingWrapper(${Component.displayName})`
      render() {
        return f(this.props).fold(
          notReady,
          props => <Component {...props} />
        )
      }
    }
  }
}

import { CacheEvent } from '../'

export type OwnProps<P, WP> = {
  data: CacheEvent<P>,
  props: WP
}

export function loading2<WP>(Component: React.ComponentClass<WP>): <P>(notReady: () => JSX.Element | null, ready: (data: P, loading: boolean) => JSX.Element) => React.ComponentClass<OwnProps<P, WP>> {
  return function <P>(notReady: () => JSX.Element | null, ready: (data: P, loading: boolean) => JSX.Element) {
    return class LoadingWrapper extends React.Component<OwnProps<P, WP>, void> {
      static displayName = `LoadingWrapper(${Component.displayName})`
      render() {
        const { data, loading } = this.props.data
        return data.fold(
          notReady,
          p => ready(p, loading)
        )
      }
    }
  }
}
