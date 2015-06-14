import t from 'tcomb';
import Query from './Query';
import { ActualizedQuery, FetcherQuery } from './Query';

const nonEmptyList = list => list.length > 0;

// AvengerInput

const AvengerInputQuery = t.struct({
  query: Query,
  params: t.maybe(t.Obj)
});

export const AvengerInputQueries = t.subtype(
  t.list(AvengerInputQuery),
  nonEmptyList,
  'AvengerInputQueries'
);

const AvengerInput = t.struct({
  queries: AvengerInputQueries,
  implicitState: t.maybe(t.Obj)
}, 'AvengerInput');

export default AvengerInput;

// AvengerActualizedInput

const AvengerInputActualizedQuery = t.struct({
  query: ActualizedQuery,
  params: t.maybe(t.Obj)
}, 'AvengerInputActualizedQuery');

const AvengerInputActualizedQueries = t.subtype(
  t.list(AvengerInputActualizedQuery),
  nonEmptyList,
  'AvengerInputActualizedQueries'
);

export const AvengerActualizedInput = t.struct({
  queries: AvengerInputActualizedQueries,
  implicitState: t.maybe(t.Obj)
}, 'AvengerActualizedInput');

// AvengerFetcherInput

const AvengerInputFetcherQuery = t.struct({
  query: FetcherQuery,
  params: t.maybe(t.Obj)
}, 'AvengerInputFetcherQuery');

const AvengerInputFetcherQueries = t.subtype(
  t.list(AvengerInputFetcherQuery),
  nonEmptyList,
  'AvengerInputFetcherQueries'
);

export const AvengerFetcherInput = t.struct({
  queries: AvengerInputFetcherQueries,
  implicitState: t.maybe(t.Obj)
}, 'AvengerFetcherInput');
