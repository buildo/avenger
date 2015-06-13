import t from 'tcomb';

const ActualizedCache = t.struct({
  value: t.Any,

  // TODO(gio): not sure if this is sane for testing purposes
  // might reconsider and instead return all the set caches in a single callback
  set: t.Func
}, 'ActualizedCache');

const AvengerActualizedCache = t.dict(t.Str, ActualizedCache, 'AvengerActualizedCache');

export default AvengerActualizedCache;
