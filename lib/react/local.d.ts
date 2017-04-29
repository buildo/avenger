/// <reference types="react" />
import * as React from 'react';
import 'rxjs/add/operator/map';
import { Transition } from './transition';
import { Any, TypeOf } from 'io-ts';
import { Option } from 'fp-ts/lib/Option';
export declare function local<WP, L extends Any>(Component: React.ComponentClass<WP>, locals: L): <OP>(f: (ownProps: OP, state: Option<TypeOf<L>>, transition: Transition<TypeOf<L>>) => WP) => React.ComponentClass<OP>;
