import { doUpdateLocation, location } from '../src/browser/location';
import { right } from 'fp-ts/lib/Either';

describe('browser/location', () => {
  it('query/command should parse/stringify the `search` query', async () => {
    let locationObject = { pathname: '/foo', search: { foo: 'bar' } };
    await doUpdateLocation(locationObject).run();
    expect(await location.run().run()).toEqual(right(locationObject));
  });

  it('in command `/` prefix should be optional', async () => {
    await doUpdateLocation({
      pathname: 'bar',
      search: { bar: 'foo' }
    }).run();
    expect(await location.run().run()).toEqual(
      right({
        pathname: '/bar',
        search: { bar: 'foo' }
      })
    );
  });

  it('command should omit `undefined` params from `search`', async () => {
    await doUpdateLocation({
      pathname: '/',
      search: { bar: 'baz', baz: undefined }
    }).run();
    expect(await location.run().run()).toEqual(
      right({
        pathname: '/',
        search: { bar: 'baz' }
      })
    );
  });
});
