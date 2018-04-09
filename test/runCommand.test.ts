import { runCommand } from "../src";
import { Command } from "../src";
import { Query } from "../src";
import { query } from "../src";
import * as t from "io-ts";
import sleep from "./sleep";

describe("runCommand", () => {
  it("should run an empty command", () => {
    const c = Command({ params: {}, run: () => Promise.resolve({}) });
    return runCommand(c, {});
  });

  it("should run a command with params and invalidate queries", async () => {
    const fetchFoo = jest.fn(({ foo }: { foo: string }) =>
      Promise.resolve(foo)
    );
    const q1 = Query({
      params: { foo: t.string },
      fetch: fetchFoo as (params: { foo: string }) => Promise<string>
    });

    const q2 = Query({
      params: { foo: t.string },
      fetch: fetchFoo as (params: { foo: string }) => Promise<string>
    });

    query({ q1, q2 }, { foo: "foo" }).subscribe(() => {});

    expect(fetchFoo.mock.calls.length).toBe(2);
    expect(fetchFoo.mock.calls[0][0]).toEqual({ foo: "foo" });
    expect(fetchFoo.mock.calls[1][0]).toEqual({ foo: "foo" });

    const c = Command({
      invalidates: { q1, q2 },
      params: { bar: t.string },
      run: ({ bar }) => Promise.resolve(bar)
    });

    const result = await runCommand(c, { foo: "foo", bar: "bar" });
    expect(result).toBe("bar");
    expect(fetchFoo.mock.calls.length).toBe(4);
    expect(fetchFoo.mock.calls[2][0]).toEqual({ foo: "foo" });
    expect(fetchFoo.mock.calls[3][0]).toEqual({ foo: "foo" });
    return result;
  });

  it("should run a command and its dependencies", async () => {
    const fetchQ1 = jest.fn(({ foo1 }: { foo1: string }) =>
      Promise.resolve(foo1)
    );

    const fetchQ2 = jest.fn(({ foo2 }: { foo2: string }) =>
      Promise.resolve(foo2)
    );
    const q1 = Query({
      params: { foo1: t.string },
      fetch: fetchQ1 as (params: { foo1: string }) => Promise<string>
    });

    const q2 = Query({
      params: { foo2: t.string },
      fetch: fetchQ2 as (params: { foo2: string }) => Promise<string>
    });

    query({ q1, q2 }, { foo1: "foo1", foo2: "foo2" }).subscribe(() => {});

    expect(fetchQ1.mock.calls.length).toBe(1);
    expect(fetchQ1.mock.calls[0][0]).toEqual({ foo1: "foo1" });
    expect(fetchQ2.mock.calls.length).toBe(1);
    expect(fetchQ2.mock.calls[0][0]).toEqual({ foo2: "foo2" });

    await sleep(10);

    const c = Command({
      dependencies: { q1, q2 },
      params: { bar: t.string },
      run: ({ bar, q1, q2 }) => Promise.resolve({ bar, q1, q2 })
    });

    const result = await runCommand(c, {
      foo1: "foo1",
      foo2: "foo2",
      bar: "bar"
    });

    expect(result).toEqual({ q1: "foo1", q2: "foo2", bar: "bar" });

    expect(fetchQ1.mock.calls.length).toBe(2);
    expect(fetchQ1.mock.calls[1][0]).toEqual({ foo1: "foo1" });
    expect(fetchQ2.mock.calls.length).toBe(2);
    expect(fetchQ2.mock.calls[1][0]).toEqual({ foo2: "foo2" });
  });

  it.skip("should not run dependencies overwritten by command params", async () => {
    /*
    Test skipped because the feature was removed.
    The code of the feature was very simple; it just added the following line
    in runCommand, before running the queries:
      const depsToRun = omit(command.dependencies, Object.keys(flatParams))

    We decided to remove it beacause in terms of TS typings it was too complicated.
    */

    const fetchQ1 = jest.fn(({ foo1 }: { foo1: string }) =>
      Promise.resolve(foo1)
    );

    const fetchQ2 = jest.fn(({ foo2 }: { foo2: string }) =>
      Promise.resolve(foo2)
    );

    const q1 = Query({
      params: { foo1: t.string },
      fetch: fetchQ1 as (params: { foo1: string }) => Promise<string>
    });

    const q2 = Query({
      params: { foo2: t.string },
      fetch: fetchQ2 as (params: { foo2: string }) => Promise<string>
    });

    query({ q1, q2 }, { foo1: "foo1", foo2: "foo2" }).subscribe(() => {});

    expect(fetchQ1.mock.calls.length).toBe(1);
    expect(fetchQ1.mock.calls[0][0]).toEqual({ foo1: "foo1" });
    expect(fetchQ2.mock.calls.length).toBe(1);
    expect(fetchQ2.mock.calls[0][0]).toEqual({ foo2: "foo2" });

    await sleep(10);

    const c = Command({
      dependencies: { q1, q2 },
      params: { bar: t.string },
      run: ({ bar, q1, q2 }) => Promise.resolve({ bar, q1, q2 })
    });

    const result = await runCommand(c, {
      foo1: "foo1",
      q2: "foo2",
      bar: "bar"
    });

    expect(result).toEqual({ q1: "foo1", q2: "foo2", bar: "bar" });

    expect(fetchQ1.mock.calls.length).toBe(2);
    expect(fetchQ1.mock.calls[1][0]).toEqual({ foo1: "foo1" });
    expect(fetchQ2.mock.calls.length).toBe(1);
  });
});
