/// <reference types="react" />
import * as React from 'react';
import { ConnectContext } from './connect';
import { TransitionContext } from './transition';
export declare type Props<S> = ConnectContext<S> & TransitionContext<S>;
export declare class Provider<S> extends React.Component<Props<S>, void> {
    static childContextTypes: {
        state: React.Validator<any>;
        transition: React.Validator<any>;
    } & {
        transition: React.Validator<any>;
    };
    getChildContext(): ConnectContext<S>;
    render(): JSX.Element;
}
