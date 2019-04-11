import {
  getActiveValidatorIndices, getCurrentEpoch, getBalance
} from "../../helpers/stateTransitionHelpers";
import { BeaconState } from "../../../types";
import { EJECTION_BALANCE } from "../../../constants";
import { initiateValidatorExit } from "../../helpers/validatorStatus";


/**
 * Iterate through the validator registry and eject active validators with balance below EJECTION_BALANCE.
 * @param {BeaconState} state
 */
export function processEjections(state: BeaconState): void {

  getActiveValidatorIndices(state.validatorRegistry, getCurrentEpoch(state)).forEach((index) => {
    if (getBalance(state, index).ltn(EJECTION_BALANCE)) {
      initiateValidatorExit(state, index);
    }
  });
}
