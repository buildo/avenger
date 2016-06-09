declare module 'tcomb' {

  declare interface $Refinement<P: (x: any) => boolean> {}

  declare interface Type<T> {
    (x: T): T;
    is(x: any): boolean;
  }

  declare class Tcomb {
    assert(guard: boolean, message?: string | () => string): void;
    stringify(x: any): string;
    Nil: Type<void | null>;
    String: Type<string>;
    Number: Type<number>;
    Boolean: Type<boolean>;
    Integer: Type<number>;
    Function: Type<Function>;
    Array: Type<Array<any>>;
    list<T>(type: Type<T>, name?: string): Type<Array<T>>;
  }

  declare var exports: Tcomb;
}
