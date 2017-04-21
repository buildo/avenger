import * as React from 'react'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/map'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Option } from 'fp-ts/lib/Option'

export type ConnectContext<S> = {
  state: BehaviorSubject<S>
}

export const ConnectContextTypes = {
  state: React.PropTypes.object.isRequired
}

export function connect<S>(): <WP>(Component: React.ComponentClass<WP>) => <OP>(f: (ownProps: OP, state: S) => Option<WP>) => React.ComponentClass<OP> {
  return function<WP>(Component: React.ComponentClass<WP>) {
    return function<OP>(f: (ownProps: OP, state: S) => Option<WP>) {
      return class ConnectWrapper extends React.Component<OP, { option: Option<WP> }> {
        static displayName = `ConnectWrapper(${Component.displayName})`
        static contextTypes = ConnectContextTypes
        context: ConnectContext<S>
        subscription: Subscription
        constructor(props: OP, context: ConnectContext<S>) {
          super(props, context)
          this.state = { option: f(props, context.state.value) }
        }
        componentDidMount() {
          this.subscription = this.context.state
            .subscribe(state => this.setState(() => ({ option: f(this.props, state) })))
        }
        componentWillUnmount() {
          this.subscription.unsubscribe()
        }
        componentWillReceiveProps(nextProps: OP) {
          this.setState(() => ({ option: f(nextProps, this.context.state.value) }))
        }
        render() {
          return this.state.option.fold(
            () => null,
            wp => <Component {...wp} />
          )
        }
      }
    }
  }
}
