import { invalidate } from './invalidate'

export function runCommand(graph, command, A) {
  return command.run(A).then(v => {
    const Ps = Object.keys(command.invalidates || {});
    invalidate(graph, Ps, A);
    return v;
  });
}
