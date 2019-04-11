import {getCurrentEpoch} from "../../helpers/stateTransitionHelpers";
import {
  BeaconState, 
  Epoch,
} from "../../../types";
import {
  FAR_FUTURE_EPOCH,
  MAX_EXIT_DEQUEUES_PER_EPOCH,
  MIN_VALIDATOR_WITHDRAWAL_DELAY,
} from "../../../constants";
import {prepareValidatorForWithdrawal} from "../../helpers/validatorStatus";


/**
 * Process the exit queue.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 */
export function processExitQueue(state: BeaconState): void {
  const currentEpoch = getCurrentEpoch(state);
  const eligibleIndices = Array.from({length: state.validatorRegistry.length})
    .filter((_, index) => {
      const validator = state.validatorRegistry[index];

      // Filter out dequeued validators
      if (validator.withdrawableEpoch != FAR_FUTURE_EPOCH) {
        return false;
      }
      // Dequeue if the minimum amount of time has passed
      return currentEpoch >= validator.exitEpoch + MIN_VALIDATOR_WITHDRAWAL_DELAY;
    });

  // Sort in order of exit epoch, and validators that exit within the same epoch exit in order of validator index
  const sortedIndices = eligibleIndices.sort((a: Epoch, b: Epoch) => {
    return state.validatorRegistry[a].exitEpoch - state.validatorRegistry[b].exitEpoch;
  });
  for (const [index, dequeues] of sortedIndices.entries()) {
    if (dequeues >= MAX_EXIT_DEQUEUES_PER_EPOCH) {
      break;
    }
    prepareValidatorForWithdrawal(state, index);
  }
}
