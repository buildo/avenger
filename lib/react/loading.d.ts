/// <reference types="react" />
import * as React from 'react';
import { Option } from 'fp-ts/lib/Option';
export declare function loading<WP>(Component: React.ComponentClass<WP>, whenLoading: () => JSX.Element): <OP>(f: (ownProps: OP) => Option<WP>) => React.ComponentClass<OP>;
