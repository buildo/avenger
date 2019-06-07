import { TaskEither, taskEither, fromLeft } from 'fp-ts/lib/TaskEither';

export namespace StatefulFetch {
  export type Order =
    | 'successFirst'
    | 'failureFirst'
    | 'alwaysSuccess'
    | 'alwaysFailure';
  export type Result = 'alwaysDifferent' | 'alwaysTheSame';
  export type OrderSequence = {
    even: () => TaskEither<string, string>;
    odd: () => TaskEither<string, string>;
  };
}

export class StatefulFetch {
  private result: StatefulFetch.Result;
  private staticSuccess = taskEither.of<string, string>('staticSuccess');
  private staticFailure = fromLeft<string, string>('staticFailure');
  private order: StatefulFetch.OrderSequence;

  private getRandomSuccess = () =>
    taskEither.of<string, string>(Math.random().toString());

  private getRandomFailure = () =>
    fromLeft<string, string>(Math.random().toString());

  private getSuccess = () => {
    return this.result === 'alwaysTheSame'
      ? this.staticSuccess
      : this.getRandomSuccess();
  };

  private getFailure = () => {
    return this.result === 'alwaysTheSame'
      ? this.staticFailure
      : this.getRandomFailure();
  };

  private orders: {
    [k in StatefulFetch.Order]: StatefulFetch.OrderSequence;
  } = {
    successFirst: {
      even: this.getSuccess,
      odd: this.getFailure
    },
    failureFirst: {
      even: this.getFailure,
      odd: this.getSuccess
    },
    alwaysSuccess: {
      even: this.getSuccess,
      odd: this.getSuccess
    },
    alwaysFailure: {
      even: this.getFailure,
      odd: this.getFailure
    }
  };

  constructor(order: StatefulFetch.Order, result: StatefulFetch.Result) {
    this.result = result;
    this.order = this.orders[order];
  }

  private state: number = 0;

  fetch = () => {
    const result = this.state % 2 === 0 ? this.order.even() : this.order.odd();
    this.state = this.state + 1;
    return result;
  };
}
