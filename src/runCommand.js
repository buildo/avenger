import { invalidate } from './invalidate'

export function runCommand(command, flatParams) {
  return command.run(flatParams).then(v => {
    invalidate(command.invalidates || {}, flatParams);
    return v;
  });
}
