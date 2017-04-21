/// <reference types="react" />
import * as React from 'react';
import { ObservableFetch, CacheEvent } from '../index';
import 'rxjs/add/operator/debounceTime';
export declare type Loading = () => JSX.Element;
export declare function query<A, P, WP>(query: ObservableFetch<A, P>, Component: React.ComponentClass<WP>): <OP>(f: (ownProps: OP, event: CacheEvent<P>) => WP) => React.ComponentClass<OP & A>;
