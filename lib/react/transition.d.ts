/// <reference types="react" />
import * as React from 'react';
export declare type Transition<S> = (setter: (s: S) => S) => void;
export declare type TransitionContext<S> = {
    transition: Transition<S>;
};
export declare const TransitionContextTypes: {
    transition: React.Validator<any>;
};
export declare function transition<S>(): <WP>(Component: React.ComponentClass<WP>) => <OP>(f: (ownProps: OP, transition: Transition<S>) => WP) => React.ComponentClass<OP>;
