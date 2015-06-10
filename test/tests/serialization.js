import expect from 'expect';
import * as avenger from '../../src';
import { AvengerInput } from '../../src';
import queries from '../../fixtures/queries';

describe('serialization', () => {

  const { sample } = queries({});

  it('should accept valid AvengerInput', () => {
    expect(() => {
      AvengerInput([]);
    }).toThrow(/Invalid/);

    expect(() => {
      AvengerInput([{
        query: sample
      }]);
    }).toNotThrow();
  });

  it('avengerInput should be serializable', () => {
    const input = AvengerInput([{
      query: sample,
      params: new sample.paramsType({
        sampleId: 'a1'
      })
    }]);
    const serialized = avenger.avengerInputToJson(input);

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
      avenger.avengerInputFromJson({
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
    expect(
        avenger.avengerInputToJson(
          avenger.avengerInputFromJson({ allQueries, json: serialized }))).toEqual(serialized);
  });

});
