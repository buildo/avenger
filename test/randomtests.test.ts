import { taskEither } from 'fp-ts/lib/TaskEither';
import { observe, cache } from '../src/observe';
import { take, toArray } from 'rxjs/operators';
import { getStructSetoid, setoidString, setoidNumber } from 'fp-ts/lib/Setoid';

it('does something', async () => {
  const a = (input: number) => taskEither.of(input);
  const cachedA = cache(a, setoidNumber);
  requestAnimationFrame(() => cachedA(1).run());
  const results = await observe(cachedA, 1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  expect(results).toEqual([
    { type: 'Loading' },
    { type: 'Success', value: 1, loading: false }
  ]);
});

it('should reuse the same pending (primitive inputs)', async () => {
  const spyObj = { a: (input: number) => taskEither.of(input) };
  const aSpy = jest.spyOn(spyObj, 'a');
  const cachedA = cache(spyObj.a, setoidNumber);
  requestAnimationFrame(() => cachedA(1).run());
  requestAnimationFrame(() => cachedA(1).run());
  const o1 = observe(cachedA, 1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  const o2 = observe(cachedA, 1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  const [results1, results2] = await Promise.all([o1, o2]);
  expect(results1).toEqual(results2);
  expect(aSpy.mock.calls.length).toBe(1);
});

it('should reuse the same pending (non-primitive inputs)', async () => {
  const spyObj = { a: (input: { foo: string }) => taskEither.of(input) };
  const aSpy = jest.spyOn(spyObj, 'a');
  const cachedA = cache(spyObj.a, getStructSetoid({ foo: setoidString }));
  const input1 = { foo: 'bar' };
  const input2 = { foo: 'bar' };
  requestAnimationFrame(() => cachedA(input1).run());
  requestAnimationFrame(() => cachedA(input2).run());
  const o1 = observe(cachedA, input1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  const o2 = observe(cachedA, input2)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  const [results1, results2] = await Promise.all([o1, o2]);
  expect(results1).toEqual(results2);
  expect(aSpy.mock.calls.length).toBe(1);
});
