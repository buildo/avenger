/// <reference types="react" />
import * as React from 'react';
import 'rxjs/add/operator/map';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Option } from 'fp-ts/lib/Option';
export declare type ConnectContext<S> = {
    state: BehaviorSubject<S>;
};
export declare const ConnectContextTypes: {
    state: React.Validator<any>;
};
export declare function connect<S>(): <WP>(Component: React.ComponentClass<WP>) => <OP>(f: (ownProps: OP, state: S) => Option<WP>) => React.ComponentClass<OP>;
