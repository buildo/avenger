import t from 'tcomb';

const ActualizedCache = t.struct({
  value: t.Any,
  set: t.Func
}, 'ActualizedCache');

const AvengerActualizedInput = t.dict(t.Str, ActualizedCache, 'AvengerActualizedInput');

export default AvengerActualizedInput;
