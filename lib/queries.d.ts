/// <reference types="react" />
import * as React from 'react';
import { Merge, CacheEvent } from './index';
export declare function queries<A, P extends Array<CacheEvent<any>>, WP>(merge: Merge<A, P>, Component: React.ComponentClass<WP>): <OP>(f: (events: P, ownProps: OP) => WP) => React.ComponentClass<OP & A>;
