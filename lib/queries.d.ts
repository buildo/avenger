/// <reference types="react" />
import * as React from 'react';
import { Queries, CacheEvent } from './index';
import 'rxjs/add/operator/debounceTime';
export declare function queries<A, P extends Array<CacheEvent<any>>, WP>(queries: Queries<A, P>, Component: React.ComponentClass<WP>): <OP>(f: (events: P, ownProps: OP) => WP) => React.ComponentClass<OP & A>;
