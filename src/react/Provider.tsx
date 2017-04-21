import * as React from 'react'
import { ConnectContext, ConnectContextTypes } from './connect'
import { TransitionContext, TransitionContextTypes } from './transition'

export type Props<S> = ConnectContext<S> & TransitionContext<S>

export class Provider<S> extends React.Component<Props<S>, void> {
  static childContextTypes = Object.assign({}, ConnectContextTypes, TransitionContextTypes)
  getChildContext(): ConnectContext<S> {
    const { children, ...props } = this.props
    return props
  }
  render() {
    return <div>{this.props.children}</div>
  }
}
