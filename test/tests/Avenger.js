import expect from 'expect';
import Avenger from '../../src';
import { AvengerInput } from '../../src';
import queries from '../../fixtures/queries';

describe('Avenger', () => {

  const { sample } = queries({});

  it('should accept valid AvengerInput', () => {
    expect(() => {
      new Avenger(AvengerInput([]));
    }).toThrow(/Invalid/);

    expect(() => {
      new Avenger(AvengerInput([{
        query: sample
      }]));
    }).toNotThrow();
  });

  it('should be serializable', () => {
    const av = new Avenger(AvengerInput([{
      query: sample,
      params: new sample.paramsType({
        sampleId: 'a1'
      })
    }]));
    const serialized = av.toJSON();

    expect(serialized).toEqual([{
      sample: { sampleId: 'a1' }
    }]);
  });

  it('should be deserializable', () => {
    const serialized = [{
      sample: { sampleId: 'a1' }
    }];
    const allQueries = queries({});
    expect(() => {
      Avenger.fromJSON({
        json: serialized,
        allQueries
      });
    }).toNotThrow();
  });

  it('there and back', () => {
    const serialized = [{
      sample: { sampleId: 'a1' }
    }];
    const allQueries = queries({});
    expect(Avenger.fromJSON({ allQueries, json: serialized }).toJSON()).toEqual(serialized);
  });

});