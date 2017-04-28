import * as React from 'react'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/map'
import { Transition } from './transition'
import { ConnectContext, ConnectContextTypes } from './connect'
import { Any, TypeOf } from 'io-ts'
import * as _ from 'lodash'

export function local<WP, L extends { [k: string]: Any }, S extends { [k in keyof L]?: TypeOf<L[k]> }>(
  Component: React.ComponentClass<WP>,
  locals: L
): <OP>(f: (ownProps: OP, state: S, transition: Transition<S>) => WP) => React.ComponentClass<OP> {
  return function<OP>(f: (ownProps: OP, state: S, transition: Transition<S>) => WP) {
    return class LocalWrapper extends React.Component<OP, { props: WP }> {
      static displayName = `LocalWrapper(${Component.displayName})`
      static contextTypes = ConnectContextTypes
      static instanceCount = 0
      instanceNamespace: string
      context: ConnectContext<any>
      subscription: Subscription
      constructor(props: OP, context: ConnectContext<any>) {
        super(props, context)
        this.state = { props: f(props, context.state.value, context.transition) }
      }
      localizeGlobalState(state: any): S {
        return _.get(state, ['__local', LocalWrapper.displayName, this.instanceNamespace], {}) as S
      }
      transition(localPatch: S) {
        const state = this.context.state.value as any
        const p = _.get(state, ['__local', LocalWrapper.displayName, this.instanceNamespace], {})
        const pp = Object.assign({}, p, localPatch)
        for (const key in localPatch) {
          if (pp[key] === null || typeof pp[key] === 'undefined') {
            delete pp[key]
          }
        }
        const patch = _.set(Object.assign({}, state), ['__local', LocalWrapper.displayName, this.instanceNamespace], pp)
        return this.context.transition(patch as any)
      }
      componentWillMount() {
        LocalWrapper.instanceCount += 1
        this.instanceNamespace = `instance-${LocalWrapper.instanceCount}`
      }
      componentDidMount() {
        this.subscription = this.context.state
          .subscribe(state => this.setState(() => ({ props: f(this.props, this.localizeGlobalState(state), this.transition) })))
      }
      componentWillReceiveProps(nextProps: OP) {
        this.setState(() => ({ props: f(nextProps, this.localizeGlobalState(this.context.state.value), this.transition) }))
      }
      componentWillUnmount() {
        this.subscription.unsubscribe()
        const __local = this.context.state.value.__local
        if (__local && __local[LocalWrapper.displayName] && __local[LocalWrapper.displayName][this.instanceNamespace]) {
          const patch = Object.assign({}, { __local })
          delete patch.__local[LocalWrapper.displayName][this.instanceNamespace]
          this.context.transition(patch)
        }
      }
      render() {
        return <Component {...this.state.props} />;
      }
    }
  }
}
