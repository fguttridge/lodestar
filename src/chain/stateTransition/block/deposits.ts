import assert from "assert";

import {
  BeaconBlock,
  BeaconState,
} from "../../../types";

import {
  MAX_DEPOSITS,
} from "../../../constants";

import {
  processDeposit,
} from "../../helpers/stateTransitionHelpers";

export default function processDeposits(state: BeaconState, block: BeaconBlock): void {
  assert(block.body.deposits.length === Math.min(MAX_DEPOSITS, block.body.eth1Data.depositCount - state.depositIndex));
  for (const deposit of block.body.deposits) {
    processDeposit(state, deposit);
  }
}
