// @flow

import type { Observable } from 'rxjs/Observable';

import type {
  FetchT
} from '../fetch/operators'

import type {
  CachedFetchT
} from './operators'

import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/map'

import {
  observe
} from './observe'

export function query<A, P>(fetch: FetchT<A, P> | CachedFetchT<A, P>, a: A): Observable {
  const observer = observe(fetch, a)
  fetch(a)
  return observer
}
