import t from 'tcomb';
import Query from './Query';

const AvengerInput = t.subtype(t.list(t.struct({
  query: Query,
  params: t.maybe(t.Obj)
})), list => list.length > 0, 'AvengerInput');

export default AvengerInput;
