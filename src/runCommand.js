import { invalidate } from "./invalidate";
import { query } from "./query";
import omit from 'lodash/omit';

export function runCommand(command, flatParams) {
  const noDeps = Object.keys(command.dependencies).length === 0;
  if (noDeps) {
    return command.run(flatParams).then(v => {
      invalidate(command.invalidates, flatParams);
      return v;
    });
  } else {
    const depsToRun = omit(command.dependencies, Object.keys(flatParams))
    return new Promise((resolve, reject) =>
      query(depsToRun, flatParams)
        .filter(event => !event.loading)
        .subscribe(event => {
          const queryResults = Object.keys(event.data).reduce(
            (acc, k) => ({
              ...acc,
              [k]: event.data[k].data
            }),
            {}
          );
          resolve(
            command.run({ ...queryResults, ...flatParams }).then(v => {
              invalidate(command.invalidates, flatParams);
              return v;
            })
          );
        }, reject)
    );
  }
}
