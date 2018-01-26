declare module 'avenger/lib/cache/strategies' {
  export class Strategy { }
  export class Expire extends Strategy {
    constructor(millis: number)
  }
  export const available: Strategy;
}
