import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum PollStatus { open = 0, closed = 1 }

export type Poll = { question: string;
                     options: string[];
                     optionCount: bigint;
                     status: PollStatus;
                     creator: Uint8Array
                   };

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  voteChoice(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  createPoll(context: __compactRuntime.CircuitContext<PS>,
             question_0: string,
             options_0: string[],
             optionCount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closePoll(context: __compactRuntime.CircuitContext<PS>, pollId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>, pollId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  createPoll(context: __compactRuntime.CircuitContext<PS>,
             question_0: string,
             options_0: string[],
             optionCount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closePoll(context: __compactRuntime.CircuitContext<PS>, pollId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>, pollId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  createPoll(context: __compactRuntime.CircuitContext<PS>,
             question_0: string,
             options_0: string[],
             optionCount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closePoll(context: __compactRuntime.CircuitContext<PS>, pollId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>, pollId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly pollCount: bigint;
  polls: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Poll;
    [Symbol.iterator](): Iterator<[bigint, Poll]>
  };
  tallies: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
