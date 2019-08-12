import {
  doUpdateLocation,
  location,
  requestConfirmationToUpdateLocation,
  doResolvePendingUpdateLocation
} from '../src/browser/location';
import { right } from 'fp-ts/lib/Either';
import { observeStrict } from '../src/observe';
import { delay } from 'fp-ts/lib/Task';

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

  it('blocking transitions should work', async () => {
    await doUpdateLocation({
      pathname: '/',
      search: {}
    }).run();

    let unblock = requestConfirmationToUpdateLocation();
    await doUpdateLocation({
      pathname: '/foo',
      search: { bar: 'baz' }
    }).run();
    expect(await location.run().run()).toEqual(
      right({
        pathname: '/',
        search: {}
      })
    );
    await doResolvePendingUpdateLocation(false).run();
    expect(await location.run().run()).toEqual(
      right({
        pathname: '/',
        search: {}
      })
    );
    unblock();

    unblock = requestConfirmationToUpdateLocation();
    await doUpdateLocation({
      pathname: '/foo',
      search: { bar: 'baz' }
    }).run();
    expect(await location.run().run()).toEqual(
      right({
        pathname: '/',
        search: {}
      })
    );
    await doResolvePendingUpdateLocation(true).run();
    expect(await location.run().run()).toEqual(
      right({
        pathname: '/foo',
        search: { bar: 'baz' }
      })
    );
    unblock();
  });

  it('should push to history when running command with different input', async () => {
    await doUpdateLocation({
      pathname: '/foo',
      search: { foo: 'bar' }
    }).run();
    const fn = jest.fn();
    observeStrict(location, undefined).subscribe(fn);
    await delay(0, void 0).run();
    expect(fn.mock.calls.length).toBe(2);
    await doUpdateLocation({
      pathname: '/foo2',
      search: { foo: 'bar2' }
    }).run();
    await delay(0, void 0).run();
    expect(fn.mock.calls.length).toBe(4);
  });

  it('should not push to history when running command with the same input', async () => {
    await doUpdateLocation({
      pathname: '/foo',
      search: { foo: 'bar' }
    }).run();
    const fn = jest.fn();
    observeStrict(location, undefined).subscribe(fn);
    await delay(0, void 0).run();
    expect(fn.mock.calls.length).toBe(2);
    await doUpdateLocation({
      pathname: '/foo',
      search: { foo: 'bar' }
    }).run();
    await delay(0, void 0).run();
    expect(fn.mock.calls.length).toBe(2);
  });

  it('should trim spaces and slashes in pathname', async () => {
    await doUpdateLocation({
      pathname: ' //foos ',
      search: {}
    }).run();
    expect(await location.run().run()).toEqual(
      right({
        pathname: '/foos',
        search: {}
      })
    );
  });
});
