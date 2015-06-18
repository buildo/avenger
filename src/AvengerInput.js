import t from 'tcomb';
import Query from './Query';

const nonEmptyList = list => list.length > 0;

// AvengerInput

const AvengerQueryRef = t.struct({
  query: Query,
  params: t.maybe(t.Obj)
});

export const AvengerQueryRefs = t.subtype(
  t.list(AvengerQueryRef),
  nonEmptyList,
  'AvengerInputQueries'
);

const AvengerInput = t.struct({
  queries: AvengerQueryRefs,
  implicitState: t.maybe(t.Obj)
}, 'AvengerInput');

export default AvengerInput;

// MinimizedCache

// const MinimizedCache = t.dict(t.Str, t.Obj);
