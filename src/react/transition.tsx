import * as React from 'react'

export type Transition<S> = (setter: Partial<S> | ((s: S) => S)) => void

export type TransitionContext<S> = {
  transition: Transition<S>
}

export const TransitionContextTypes = {
  transition: React.PropTypes.func.isRequired
}

export function transition<S>(): <WP>(Component: React.ComponentClass<WP>) => <OP>(f: (ownProps: OP, transition: Transition<S>) => WP) => React.ComponentClass<OP> {
  return function<WP>(Component: React.ComponentClass<WP>) {
    return function <OP>(f: (ownProps: OP, transition: Transition<S>) => WP) {
      return class TransitionWrapper extends React.Component<OP, void> {
        static contextTypes = TransitionContextTypes
        static displayName = `TransitionWrapper(${Component.displayName})`
        context: TransitionContext<S>
        render() {
          return <Component {...f(this.props, this.context.transition)} />
        }
      }
    }
  }
}
