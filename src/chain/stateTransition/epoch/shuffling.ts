import {BeaconState, Validator} from "../../../types";
import {getCurrentEpochCommitteeCount, getEffectiveBalance, getTotalBalance, getActiveValidatorIndices, getCurrentEpoch} from "../../helpers/stateTransitionHelpers";
import {SHARD_COUNT, FAR_FUTURE_EPOCH, LATEST_SLASHED_EXIT_LENGTH, MAX_DEPOSIT_AMOUNT, MAX_BALANCE_CHURN_QUOTIENT} from "../../../constants";
import BN from "bn.js";
import { exitValidator, activateValidator } from "../../helpers/validatorStatus";
import { bnMax } from "../../../helpers/math";


/**
 * Updates the validator registry
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 */
export function updateValidatorRegistry(state: BeaconState): void {
  const currentEpoch = getCurrentEpoch(state);
  // The active validators
  const activeValidatorIndices = getActiveValidatorIndices(state.validatorRegistry, currentEpoch);
  // The total effective balance of active validators
  const totalBalance = getTotalBalance(state, activeValidatorIndices);

  // The maximum balance chrun in Gwei (for deposits and exists separately)
  const maxBalanceChurn = bnMax(
    new BN(MAX_DEPOSIT_AMOUNT),
    totalBalance.divn(2 * MAX_BALANCE_CHURN_QUOTIENT),
  );

  // Activate validators within the allowable balance churn
  let balanceChurn = new BN(0);
  state.validatorRegistry.forEach((validator, index) => {
    if (validator.activationEpoch === FAR_FUTURE_EPOCH && state.balances[index].gten(MAX_DEPOSIT_AMOUNT)) {
      // Check the balance churn would be within the allowance
      balanceChurn = balanceChurn.add(getEffectiveBalance(state, index));
      if (balanceChurn.gt(maxBalanceChurn)) {
        return;
      }
      // Activate Validator
      activateValidator(state, index, false);
    }
  });

  // Exit validators within the allowable balance churn
  if (currentEpoch < state.validatorRegistryUpdateEpoch + LATEST_SLASHED_EXIT_LENGTH) {
    balanceChurn = (
      state.latestSlashedBalances[state.validatorRegistryUpdateEpoch % LATEST_SLASHED_EXIT_LENGTH].sub(
        state.latestSlashedBalances[currentEpoch % LATEST_SLASHED_EXIT_LENGTH])
    );
    state.validatorRegistry.forEach((validator: Validator, index) => {
      if (validator.exitEpoch === FAR_FUTURE_EPOCH && validator.initiatedExit) {
        // Check the balance churn would be within the allowance
        balanceChurn = balanceChurn.add(getEffectiveBalance(state, index));
        if (balanceChurn.gt(maxBalanceChurn)) {
          return;
        }
        // Exit Validator
        exitValidator(state, index);
      }
    });
  }

  state.validatorRegistryUpdateEpoch = currentEpoch;
}

/**
 * Main function to process the validator registry and shuffle seed data.
 * @param {BeaconState} state
 * @param {Epoch} currentEpoch
 * @param {Epoch} nextEpoch
 */
export function updateRegistry(state: BeaconState): void {
  // Check if we should update, and if so, update
  if (state.finalizedEpoch > state.validatorRegistryUpdateEpoch) {
    updateValidatorRegistry(state)
  }
  state.latestStartShard = (
    state.latestStartShard + getCurrentEpochCommitteeCount(state)
  ) % SHARD_COUNT;
}


