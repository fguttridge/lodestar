import {
  getActiveValidatorIndices, getCurrentEpoch,
  getEffectiveBalance, getTotalBalance, intDiv, decreaseBalance,
} from "../../helpers/stateTransitionHelpers";
import {
  BeaconState,
  Validator,
} from "../../../types";
import {
  LATEST_SLASHED_EXIT_LENGTH, MIN_PENALTY_QUOTIENT,
} from "../../../constants";
import {bnMax, bnMin} from "../../../helpers/math";


/**
 * Process the slashings.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 */
export function processSlashings(state: BeaconState): void {
  const currentEpoch = getCurrentEpoch(state);
  const activeValidatorIndices = getActiveValidatorIndices(state.validatorRegistry, currentEpoch);
  const totalBalance = getTotalBalance(state, activeValidatorIndices);

  // Compute `totalPenalties`
  const totalAtStart = state.latestSlashedBalances[(currentEpoch + 1) % LATEST_SLASHED_EXIT_LENGTH];
  const totalAtEnd = state.latestSlashedBalances[currentEpoch % LATEST_SLASHED_EXIT_LENGTH];
  const totalPenalties = totalAtEnd.sub(totalAtStart);

  state.validatorRegistry.map((validator: Validator, index: number) => {
    if (validator.slashed && currentEpoch === intDiv(validator.withdrawableEpoch - LATEST_SLASHED_EXIT_LENGTH, 2)) {
      const validatorBalance = getEffectiveBalance(state, index);
      const penalty = bnMax(
        validatorBalance.mul(bnMin(totalPenalties.muln(3), totalBalance)).div(totalBalance),
        validatorBalance.divn(MIN_PENALTY_QUOTIENT)
      );
      decreaseBalance(state, index, penalty);
    }
  })
}
