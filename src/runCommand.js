import { invalidate } from './invalidate'

export function runCommand(graph, command, A) {
  return command.run(A).then(v => {
    invalidate(command.invalidates || {}, A);
    return v;
  });
}
