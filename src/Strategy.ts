import { CacheValue } from './CacheValue';

export interface Strategy<A, L, P> {
  (cacheValue: CacheValue<L, P>, params: A): boolean;
}

export const refetch: Strategy<any, any, any> = cacheValue =>
  cacheValue.type === 'Pending';

export const available: Strategy<any, any, any> = () => true;

export function expire(timeoutMs: number): Strategy<any, any, any> {
  return cacheValue =>
    cacheValue.type === 'Pending' ||
    cacheValue.updated.getTime() < Date.now() - timeoutMs;
}
