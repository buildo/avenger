import * as React from 'react'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/map'
import { Transition } from './transition'
import { ConnectContext, ConnectContextTypes } from './connect'
import { Any, TypeOf } from 'io-ts'
import * as _ from 'lodash'
import { fromNullable } from 'fp-ts/lib/Option'

const GLOBAL_LOCAL_KEY = '__local'

export function local<WP, L extends Any>(
  Component: React.ComponentClass<WP>,
  locals: L,
  defaultState: TypeOf<L>
): <OP>(f: (ownProps: OP, state: TypeOf<L>, transition: Transition<TypeOf<L>>) => WP) => React.ComponentClass<OP> {
  return function<OP>(f: (ownProps: OP, state: TypeOf<L>, transition: Transition<TypeOf<L>>) => WP) {
    return class LocalWrapper extends React.Component<OP, { props: WP }> {
      static displayName = `LocalWrapper(${Component.displayName})`
      static contextTypes = ConnectContextTypes
      private static instanceCount = 0
      context: ConnectContext<any>
      write: (s: TypeOf<L>) => void
      private instanceNamespace: string
      private subscription: Subscription
      private localState: TypeOf<L>
      constructor(props: OP, context: ConnectContext<any>) {
        super(props, context)
        this.localState = this.read(context.state.value)
        this.state = this.getState(props)
        this.write = s => {
          this.localState = s
          this.transition(s)
        }
      }
      componentWillMount() {
        LocalWrapper.instanceCount += 1
        this.instanceNamespace = `instance-${LocalWrapper.instanceCount}`
      }
      componentDidMount() {
        this.subscription = this.context.state.subscribe(() => this.setState(this.getState(this.props)))
      }
      componentWillReceiveProps(nextProps: OP) {
        this.setState(this.getState(this.props))
      }
      componentWillUnmount() {
        this.subscription.unsubscribe()
        this.transition(null)
      }
      render() {
        return <Component {...this.state.props as any} />
      }
      private getState(props: OP) {
        return { props: f(props, this.localState, this.write) }
      }
      private read(state: any): TypeOf<L> {
        return fromNullable(
          _.get(state, [GLOBAL_LOCAL_KEY, LocalWrapper.displayName, this.instanceNamespace], {})
        ).getOrElse(() => defaultState)
      }
      private transition(s: TypeOf<L> | null) {
        this.context.transition(state =>
          _.set(Object.assign({}, state), [GLOBAL_LOCAL_KEY, LocalWrapper.displayName, this.instanceNamespace], s)
        )
      }
    }
  }
}
