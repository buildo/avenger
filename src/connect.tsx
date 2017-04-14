import * as React from 'react'
import { Subscription } from 'rxjs/Subscription'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import 'rxjs/add/operator/map'

export function connect<WP>(Component: React.ComponentClass<WP>): <S, OP>(f: (state: S, ownProps: OP) => WP) => React.ComponentClass<OP> {
  return function<S, OP>(f: (state: S, ownProps: OP) => WP) {
    return class ConnectWrapper extends React.Component<OP, WP> {
      static displayName = `ConnectWrapper(${Component.displayName})`
      static contextTypes = {
        subject: React.PropTypes.object.isRequired
      }
      context: ConnectContext<S>
      subscription: Subscription
      constructor(props: OP, context: ConnectContext<S>) {
        super(props, context)
        this.state = f(context.subject.value, props)
      }
      componentDidMount() {
        this.subscription = this.context.subject
          .map(state => f(state, this.props))
          .subscribe(wp => this.setState(wp))
      }
      componentWillUnmount() {
        this.subscription.unsubscribe()
      }
      componentWillReceiveProps(nextProps: OP) {
        this.setState(f(this.context.subject.value, nextProps))
      }
      render() {
        return <Component {...this.state} />
      }
    }
  }
}

export type ConnectContext<S> = { subject: BehaviorSubject<S> }

export class Provider<S> extends React.Component<ConnectContext<S>, void> {
  static childContextTypes = {
    subject: React.PropTypes.object.isRequired
  }
  getChildContext(): ConnectContext<S> {
    return { subject: this.props.subject }
  }
  render() {
    return <div>{this.props.children}</div>
  }
}
