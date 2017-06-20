import * as React from 'react'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/map'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Option } from 'fp-ts/lib/Option'
import { Transition, TransitionContext, TransitionContextTypes } from './transition'

export type ConnectContext<S> = {
  state: BehaviorSubject<S>
} & TransitionContext<S>

export const ConnectContextTypes = {
  state: React.PropTypes.object.isRequired,
  transition: TransitionContextTypes.transition
}

export function connect<S>(): <WP>(
  Component: React.ComponentClass<WP>
) => <OP>(f: (ownProps: OP, state: S, transition: Transition<S>) => Option<WP>) => React.ComponentClass<OP> {
  return function<WP>(Component: React.ComponentClass<WP>) {
    return function<OP>(f: (ownProps: OP, state: S, transition: Transition<S>) => Option<WP>) {
      return class ConnectWrapper extends React.Component<OP, { option: Option<WP> }> {
        static displayName = `ConnectWrapper(${Component.displayName})`
        static contextTypes = ConnectContextTypes
        context: ConnectContext<S>
        subscription: Subscription
        constructor(props: OP, context: ConnectContext<S>) {
          super(props, context)
          this.state = { option: f(props, context.state.value, context.transition) }
        }
        componentDidMount() {
          this.subscription = this.context.state.subscribe(state =>
            this.setState(() => ({ option: f(this.props, state, this.context.transition) }))
          )
        }
        componentWillUnmount() {
          this.subscription.unsubscribe()
        }
        componentWillReceiveProps(nextProps: OP) {
          this.setState(() => ({ option: f(nextProps, this.context.state.value, this.context.transition) }))
        }
        render() {
          return this.state.option.fold(() => null, wp => <Component {...wp as any} />)
        }
      }
    }
  }
}
