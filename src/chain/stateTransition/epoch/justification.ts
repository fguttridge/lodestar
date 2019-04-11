import BN from "bn.js";

import {BeaconState} from "../../../types";
import { getBlockRoot, getEpochStartSlot, getCurrentEpoch, getPreviousEpoch } from "../../helpers/stateTransitionHelpers";
import { getAttestingBalance, getPreviousEpochBoundaryAttestations, getCurrentEpochBoundaryAttestations, getCurrentTotalBalance, getPreviousTotalBalance } from "./helpers";


export function updateJustificationAndFinalization(state: BeaconState): void {
  const currentEpoch = getCurrentEpoch(state);
  const previousEpoch = getPreviousEpoch(state);
  const currentEpochBoundaryAttestingBalance = getAttestingBalance(state, getCurrentEpochBoundaryAttestations(state));
  const previousEpochBoundaryAttestingBalance = getAttestingBalance(state, getPreviousEpochBoundaryAttestations(state));
  const currentTotalBalance = getCurrentTotalBalance(state);
  const previousTotalBalance = getPreviousTotalBalance(state);

  let newJustifiedEpoch = state.currentJustifiedEpoch;
  let newFinalizedEpoch = state.finalizedEpoch;

  // Rotate the justification bitfield up one epoch to make room for the current epoch
  state.justificationBitfield = state.justificationBitfield.shln(1);
  // If the previous epoch gets justified, fill the second last bit
  if (previousEpochBoundaryAttestingBalance.muln(3).gte(previousTotalBalance.muln(2))) {
    newJustifiedEpoch = previousEpoch
    state.justificationBitfield = state.justificationBitfield.or(new BN(2));
  }
  // If the current epoch gets justified, fill the last bit
  if (currentEpochBoundaryAttestingBalance.muln(3).gte(currentTotalBalance.muln(2))) {
    newJustifiedEpoch = currentEpoch;
    state.justificationBitfield = state.justificationBitfield.or(new BN(1));
  }

  // Process finalizations
  // The 2nd/3rd/4th most recent epochs are all justified, the 2nd using the 4th as source
  if (state.justificationBitfield.shrn(1).modn(8) === 0b111 && state.previousJustifiedEpoch === currentEpoch - 3) {
    newFinalizedEpoch = state.previousJustifiedEpoch;
  }
  // The 2nd/3rd most recent epochs are both justified, the 2nd using the 3rd as source
  if (state.justificationBitfield.shrn(1).modn(4) === 0b11 && state.previousJustifiedEpoch === currentEpoch - 2) {
    newFinalizedEpoch = state.previousJustifiedEpoch;
  }
  // The 1st/2nd/3rd most recent epochs are all justified, the 1st using the 3rd as source
  if (state.justificationBitfield.shrn(0).modn(8) === 0b111 && state.currentJustifiedEpoch === currentEpoch - 2) {
    newFinalizedEpoch = state.currentJustifiedEpoch;
  }
  // The 1st/2nd most recent epochs are both justified, the 1st using the 2nd as source
  if (state.justificationBitfield.shrn(0).modn(4) === 0b11 && state.currentJustifiedEpoch === currentEpoch - 1) {
    state.finalizedEpoch = state.currentJustifiedEpoch;
  }

  // Update state jusification/finality fields
  state.previousJustifiedEpoch = state.currentJustifiedEpoch;
  state.previousJustifiedRoot = state.currentJustifiedRoot;
  if (newJustifiedEpoch !== state.currentJustifiedEpoch) {
    state.currentJustifiedEpoch = newJustifiedEpoch;
    state.currentJustifiedRoot = getBlockRoot(state, getEpochStartSlot(newJustifiedEpoch));
  }
  if (newFinalizedEpoch !== state.finalizedEpoch) {
    state.finalizedEpoch = newFinalizedEpoch;
    state.finalizedRoot = getBlockRoot(state, getEpochStartSlot(newFinalizedEpoch));
  }
}
