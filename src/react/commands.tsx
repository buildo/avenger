import * as React from 'react'
import { Commands, AnyCommand } from '../index'

export function commands<A, P, C extends Array<AnyCommand>, WP>
  (commands: Commands<A, P, C>, Component: React.ComponentClass<WP>):
    <OP>(f: (ownProps: OP, commands: C) => WP) => React.ComponentClass<OP & A> {

  return function<OP>(f: (ownProps: OP, commands: C) => WP) {
    return class CommandsWrapper extends React.PureComponent<OP & A, void> {
      static displayName = `CommandsWrapper(${Component.displayName})`
      render() {
        return <Component {...f(this.props as Readonly<OP>, commands.commands) as any} />
      }
    }
  }
}
