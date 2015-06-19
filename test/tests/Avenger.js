import expect from 'expect';
import sinon from 'sinon';
import Avenger, { QuerySet, QuerySetInput } from '../../src';
import queries from '../../fixtures/queries';

describe('Avenger', () => {

  const API = {
    fetchWorklist: (_id) => Promise.resolve({ worklist: { _id } }),
    fetchSamples: () => Promise.resolve({ samples: [] })
  };

  it('should be instantiable and accept valid queries set', () => {
    const { worklist } = queries(API);
    const av = new Avenger({ worklist });

    expect(av).toBeAn(Avenger);
  });

  describe('QuerySet', () => {
    const { worklist, worklistSamples } = queries(API);
    const av = new Avenger({ worklist, worklistSamples });
    const qsInput = { queries: { worklistSamples }, state: { worklistId: 'foo' } };

    it('should be created given a valid input', () => {
      const qs = av.querySet(qsInput);

      expect(qs).toBeAn(QuerySet);
    });

    it('should be run()able and return a Promise', () => {
      const qs = av.querySet(qsInput);

      expect(qs.run()).toBeAn(Promise);
    });

    it('should resolve the run() promise with the entire data set', () => {
      const qs = av.querySet(qsInput);

      return qs.run().then(data => {
        expect(data).toEqual({ worklistSamples: { samples: { samples: [] } } });
      });
    });

    it('should emit change events, more than 1, in case of success', () => {
      const qs = av.querySet(qsInput);
      const spy = sinon.spy();
      qs.on('change', spy);

      return qs.run().then(() => {
        console.log(spy);
        expect(spy.callCount).toBeGreaterThan(1);
      });
    });

  });

});
