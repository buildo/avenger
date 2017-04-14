import * as React from 'react'
import { Commands, AnyCommand } from './index'

export function commands<A, C extends Array<AnyCommand>, WP>
  (commands: Commands<A, C>, Component: React.ComponentClass<WP>):
    <OP>(f: (commands: C, ownProps: OP) => WP) => React.ComponentClass<OP & A> {

  return function<OP>(f: (commands: C, ownProps: OP) => WP) {
    return class CommandsWrapper extends React.PureComponent<OP & A, void> {
      static displayName = `CommandsWrapper(${Component.displayName})`
      render() {
        return <Component {...f(commands.commands, this.props as any)} />
      }
    }
  }
}
