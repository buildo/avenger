import t from 'tcomb';
import Query from './Query';

const Command = t.struct({
  invalidates: t.maybe(t.list(Query)),
  run: t.Func // state: t.Obj -> Promise[Any]
}, 'Command');

export default Command;
