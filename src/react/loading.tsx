import * as React from 'react'
import { Option } from 'fp-ts/lib/Option'

export function loading<WP>(Component: React.ComponentClass<WP>, whenLoading: () => JSX.Element): <OP>(f: (ownProps: OP) => Option<WP>) => React.ComponentClass<OP> {
  return function <OP>(f: (ownProps: OP) => Option<WP>) {
    return class LoadingWrapper extends React.Component<OP, void> {
      static displayName = `LoadingWrapper(${Component.displayName})`
      render() {
        return f(this.props).fold(
          whenLoading,
          props => <Component {...props} />
        )
      }
    }
  }
}
