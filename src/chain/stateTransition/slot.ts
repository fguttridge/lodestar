import { hashTreeRoot, signingRoot } from "@chainsafe/ssz";

import {
  BeaconState,
  BeaconBlockHeader,
} from "../../types";

import {
  SLOTS_PER_HISTORICAL_ROOT, ZERO_HASH,
} from "../../constants";


export function cacheState(state: BeaconState): void {
  const previousSlotStateRoot = hashTreeRoot(state, BeaconState);

  // store the previous slot's post state transition root
  state.latestStateRoots[state.slot % SLOTS_PER_HISTORICAL_ROOT] = previousSlotStateRoot;

  // cache state root in stored latest_block_header if empty
  if (state.latestBlockHeader.stateRoot.equals(ZERO_HASH)) {
    state.latestBlockHeader.stateRoot = previousSlotStateRoot;
  }

  // store latest known block for previous slot
  state.latestBlockRoots[state.slot % SLOTS_PER_HISTORICAL_ROOT] = signingRoot(state.latestBlockHeader, BeaconBlockHeader);
}

export function advanceSlot(state: BeaconState): void {
  state.slot++;
}
