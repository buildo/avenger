import { invalidate } from './invalidate';
import { query } from './query';

export function runCommand(command, flatParams) {
  if (command.dependencies) {
    // TODO don't run queries if passed as params
    return new Promise(resolve =>
      query(command.dependencies, flatParams)
        .filter(
          event =>
            Object.keys(event).filter(key => event[key].loading === true) === 0
        )
        .subscribe(event => {
          const queryResults = Object.keys(event).reduce(
            (acc, k) => ({
              ...acc,
              [k]: event[k].data
            }),
            {}
          );
          resolve(
            command.run({ ...queryResults, ...flatParams }).then(v => {
              invalidate(command.invalidates || {}, flatParams);
              return v;
            })
          );
        })
    );
  } else {
    return command.run(flatParams).then(v => {
      invalidate(command.invalidates || {}, flatParams);
      return v;
    });
  }
}
