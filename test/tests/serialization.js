import expect from 'expect';
import * as avenger from '../../src';
import { AvengerInput } from '../../src';
import queries from '../../fixtures/queries';

describe('serialization', () => {

  const { sample } = queries({});

  it('should accept valid AvengerInput', () => {
    expect(() => {
      AvengerInput({ queries: []});
    }).toThrow(/Invalid/);

    expect(() => {
      AvengerInput({ queries: [{
        query: sample
      }]});
    }).toNotThrow();
  });

  it('avengerInput should be serializable', () => {
    const input = AvengerInput({ queries: [{
      query: sample,
      params: new sample.paramsType({
        sampleId: 'a1'
      })
    }]});
    const serialized = avenger.avengerInputToJson(input);

    expect(serialized).toEqual({ queries: [{
      sample: { sampleId: 'a1' }
    }]});
  });

  it('should be deserializable', () => {
    const serialized = { queries: [{
      sample: { sampleId: 'a1' }
    }]};
    const allQueries = queries({});
    expect(() => {
      avenger.avengerInputFromJson({
        json: serialized,
        allQueries
      });
    }).toNotThrow();
  });

  it('there and back', () => {
    const serialized = { queries: [{
      sample: { sampleId: 'a1' }
    }]};
    const allQueries = queries({});
    expect(
        avenger.avengerInputToJson(
          avenger.avengerInputFromJson({ allQueries, json: serialized }))).toEqual(serialized);
  });

  it('should support implicitState', () => {
    const serialized = {
      queries: [{
        sample: { sampleId: 'a1' }
      }],
      implicitState: { foo: 'bar' }
    };
    const allQueries = queries({});
    expect(() => {
      avenger.avengerInputFromJson({
        json: serialized,
        allQueries
      });
    }).toNotThrow();
  });

});
