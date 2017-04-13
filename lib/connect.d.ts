/// <reference types="react" />
import * as React from 'react';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/map';
export declare function connect<WP>(Component: React.ComponentClass<WP>): <S, OP>(f: (state: S, ownProps: OP) => WP) => React.ComponentClass<OP>;
export declare type ConnectContext<S> = {
    subject: BehaviorSubject<S>;
};
export declare class Provider<S> extends React.Component<ConnectContext<S>, void> {
    static childContextTypes: {
        subject: React.Validator<any>;
    };
    getChildContext(): ConnectContext<S>;
    render(): JSX.Element;
}
