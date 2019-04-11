import assert from "assert";

import {BeaconState} from "../../../types";
import {SLOTS_PER_EPOCH, GENESIS_SLOT} from "../../../constants";

import {applyRewards} from "./balanceUpdates";
import {maybeResetEth1Period} from "./eth1data";
import {updateRegistry} from "./shuffling";
import {processFinalUpdates} from "./finalUpdates";
import {processCrosslinks} from "./crosslinks";
import {updateJustificationAndFinalization} from "./justification";
import { processEjections } from "./ejections";
import { processSlashings } from "./slashings";
import { processExitQueue } from "./exitQueue";

export function shouldProcessEpoch(state: BeaconState): boolean {
  return state.slot > GENESIS_SLOT && (state.slot + 1) % SLOTS_PER_EPOCH === 0;
}

export function processEpoch(state: BeaconState): BeaconState {
  assert(shouldProcessEpoch(state));

  // Justification
  updateJustificationAndFinalization(state);

  // Crosslinks
  processCrosslinks(state);

  // Eth1 Data
  maybeResetEth1Period(state);
  
  // Rewards and penalties
  applyRewards(state);

  // Ejections
  processEjections(state);

  // Validator Registry and shuffling seed data
  updateRegistry(state);

  // Slashings
  processSlashings(state);

  // Exit Queue
  processExitQueue(state);

  // Final Updates
  processFinalUpdates(state);

  return state;
}
