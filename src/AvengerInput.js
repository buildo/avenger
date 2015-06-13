import t from 'tcomb';
import Query from './Query';

export const AvengerInputQueries = t.subtype(t.list(t.struct({
  query: Query,
  params: t.maybe(t.Obj)
})), list => list.length > 0, 'AvengerInputQueries');

const AvengerInput = t.struct({
  queries: AvengerInputQueries,
  implicitState: t.maybe(t.Obj)
}, 'AvengerInput');

export default AvengerInput;
