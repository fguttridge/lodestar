import {hashTreeRoot} from "@chainsafe/ssz";
import {BeaconState, ValidatorIndex, HistoricalBatch} from "../../../types";
import {getActiveValidatorIndices, getRandaoMix, getCurrentEpoch, intDiv} from "../../helpers/stateTransitionHelpers";
import {
  ACTIVATION_EXIT_DELAY, LATEST_ACTIVE_INDEX_ROOTS_LENGTH, LATEST_RANDAO_MIXES_LENGTH,
  LATEST_SLASHED_EXIT_LENGTH,
  SLOTS_PER_HISTORICAL_ROOT,
  SLOTS_PER_EPOCH
} from "../../../constants";


export function processFinalUpdates(state: BeaconState): void {
  const currentEpoch = getCurrentEpoch(state);
  const nextEpoch = currentEpoch + 1;
  // Set active index root
  const indexRootPosition = (nextEpoch + ACTIVATION_EXIT_DELAY) % LATEST_ACTIVE_INDEX_ROOTS_LENGTH;
  state.latestActiveIndexRoots[indexRootPosition] = hashTreeRoot(
    getActiveValidatorIndices(state.validatorRegistry, nextEpoch + ACTIVATION_EXIT_DELAY),
    [ValidatorIndex],
  );
  // Set total slashed balances
  state.latestSlashedBalances[nextEpoch % LATEST_SLASHED_EXIT_LENGTH] =
    state.latestSlashedBalances[currentEpoch % LATEST_SLASHED_EXIT_LENGTH];
  // Set randao mix
  state.latestRandaoMixes[nextEpoch % LATEST_RANDAO_MIXES_LENGTH] = getRandaoMix(state, currentEpoch);
  // Set historical root accumulator
  if (nextEpoch % intDiv(SLOTS_PER_HISTORICAL_ROOT, SLOTS_PER_EPOCH) === 0) {
    const historicalBatch: HistoricalBatch = {
      blockRoots: state.latestBlockRoots,
      stateRoots: state.latestStateRoots,
    };
    state.historicalRoots.push(hashTreeRoot(historicalBatch, HistoricalBatch));
  }
  // Rotate current/previous epoch attestations
  state.previousEpochAttestations = state.currentEpochAttestations;
  state.currentEpochAttestations = [];
}
