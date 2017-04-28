/// <reference types="react" />
import * as React from 'react';
import { Option } from 'fp-ts/lib/Option';
export declare function loading<WP>(Component: React.ComponentClass<WP>, notReady: () => JSX.Element): <OP>(f: (ownProps: OP) => Option<WP>) => React.ComponentClass<OP>;
import { CacheEvent } from '../';
export declare type OwnProps<P, WP> = {
    data: CacheEvent<P>;
    props: WP;
};
export declare function loading2<WP>(Component: React.ComponentClass<WP>): <P>(notReady: () => JSX.Element | null, ready: (data: P, loading: boolean) => JSX.Element) => React.ComponentClass<OwnProps<P, WP>>;
