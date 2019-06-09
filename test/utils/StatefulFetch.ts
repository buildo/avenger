import { TaskEither, taskEither, fromLeft } from 'fp-ts/lib/TaskEither';

export namespace StatefulFetch {
  export type Order =
    | 'successFirst'
    | 'failureFirst'
    | 'alwaysSuccess'
    | 'alwaysFailure';
  export type Result = 'alwaysTheSame' | 'alwaysDifferent';
  export type OrderSequence = {
    even: () => TaskEither<string, string>;
    odd: () => TaskEither<string, string>;
  };
}

type CacheConstructor = {
  order: StatefulFetch.Order;
  resultType: StatefulFetch.Result;
  resultTag?: string;
};

export class StatefulFetch {
  private resultType: StatefulFetch.Result;
  private resultTag: string;
  private getStaticSuccess = () =>
    taskEither.of<string, string>(this.resultTag + (this.state + 1).toString());
  private getStaticFailure = () =>
    fromLeft<string, string>(this.resultTag + (this.state + 1).toString());
  private order: StatefulFetch.OrderSequence;

  private getRandomSuccess = () =>
    taskEither.of<string, string>(
      this.resultTag + (this.state + 1).toString() + Math.random().toString()
    );

  private getRandomFailure = () =>
    fromLeft<string, string>(
      this.resultTag + (this.state + 1).toString() + Math.random().toString()
    );

  private getSuccess = () => {
    return this.resultType === 'alwaysTheSame'
      ? this.getStaticSuccess()
      : this.getRandomSuccess();
  };

  private getFailure = () => {
    return this.resultType === 'alwaysTheSame'
      ? this.getStaticFailure()
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

  constructor({ order, resultType, resultTag = 'result' }: CacheConstructor) {
    this.resultType = resultType;
    this.resultTag = resultTag;
    this.order = this.orders[order];
  }

  private state: number = 0;

  fetch = () => {
    const result = this.state % 2 === 0 ? this.order.even() : this.order.odd();
    this.state = this.state + 1;
    return result;
  };
}
