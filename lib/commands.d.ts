/// <reference types="react" />
import * as React from 'react';
import { Commands, AnyCommand } from './index';
export declare function commands<A, C extends Array<AnyCommand>, WP>(commands: Commands<A, C>, Component: React.ComponentClass<WP>): <OP>(f: (commands: C, ownProps: OP) => WP) => React.ComponentClass<OP & A>;
