import t from 'tcomb';
import Avenger from './__index';
import { Query } from '.';

const worklist = Query({
  id: 'worklist',
  paramsType: t.struct({
    worklistId: t.Str
  }),
  fetchResultType: t.struct({}),
  fetch: ({ worklistId }) => () => ({
    worklist: Promise.resolve('lo')
  })
});

const allQueries = { worklist };
const av = new Avenger(allQueries, {});

const qs = av.querySet({ queries: { worklist } });

qs.on('change', data => {
  console.log('change', data);
});

qs.run().then(data => {
  console.log('done', data);
});
