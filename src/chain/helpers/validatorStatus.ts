import {
  BeaconState,
  ValidatorIndex,
} from "../../types";

import {
  GENESIS_EPOCH,
  LATEST_SLASHED_EXIT_LENGTH,
  MIN_VALIDATOR_WITHDRAWAL_DELAY,
  FAR_FUTURE_EPOCH,
  WHISTLEBLOWING_REWARD_QUOTIENT,
  PROPOSER_REWARD_QUOTIENT,
} from "../../constants";

import {
  getBeaconProposerIndex,
  getCurrentEpoch,
  getEffectiveBalance,
  getDelayedActivationExitEpoch,
  increaseBalance,
  decreaseBalance,
} from "./stateTransitionHelpers";

/**
 * Activate a validator given an index.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 * @param {boolean} isGenesis
 */
export function activateValidator(state: BeaconState, index: ValidatorIndex, isGenesis: boolean): void {
  const validator = state.validatorRegistry[index];
  validator.activationEpoch = isGenesis ? GENESIS_EPOCH : getDelayedActivationExitEpoch(getCurrentEpoch(state));
}

/**
 * Initiate exit for the validator with the given index.
 * Note: that this function mutates state.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 */
export function initiateValidatorExit(state: BeaconState, index: ValidatorIndex): void {
  const validator = state.validatorRegistry[index];
  validator.initiatedExit = true;
}
/**
 * Exit the validator of the given ``index``.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 */
export function exitValidator(state: BeaconState, index: ValidatorIndex): void {
  const validator = state.validatorRegistry[index];

  // Update validator exit epoch if not previously exited
  if (validator.exitEpoch === FAR_FUTURE_EPOCH) {
    validator.exitEpoch = getDelayedActivationExitEpoch(getCurrentEpoch(state));
  }
}

/**
 * Slash the validator with index ``slashedIndex``.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} shashedIndex
 * @param {ValidatorIndex} whistleblowerIndex
 */
export function slashValidator(state: BeaconState, slashedIndex: ValidatorIndex, whistleblowerIndex: ValidatorIndex | null = null): void {
  const currentEpoch = getCurrentEpoch(state);

  exitValidator(state, slashedIndex);
  state.validatorRegistry[slashedIndex].slashed = true;
  state.validatorRegistry[slashedIndex].withdrawableEpoch = currentEpoch + LATEST_SLASHED_EXIT_LENGTH;
  const slashedBalance = getEffectiveBalance(state, slashedIndex);
  state.latestSlashedBalances[currentEpoch % LATEST_SLASHED_EXIT_LENGTH] =
    state.latestSlashedBalances[currentEpoch % LATEST_SLASHED_EXIT_LENGTH].add(slashedBalance);

  const proposerIndex = getBeaconProposerIndex(state, state.slot);
  if (whistleblowerIndex === undefined || whistleblowerIndex === null) {
    whistleblowerIndex = proposerIndex;
  }
  const whistleblowingReward = slashedBalance.divn(WHISTLEBLOWING_REWARD_QUOTIENT);
  const proposerReward = whistleblowingReward.divn(PROPOSER_REWARD_QUOTIENT)
  increaseBalance(state, proposerIndex, proposerReward);
  increaseBalance(state, whistleblowerIndex, whistleblowingReward.sub(proposerReward));
  decreaseBalance(state, slashedIndex, whistleblowingReward);
}

/**
 * Set the validator with the given ``index`` as withdrawable
 * ``MIN_VALIDATOR_WITHDRAWAL_DELAY`` after the current epoch.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 */
export function prepareValidatorForWithdrawal(state: BeaconState, index: ValidatorIndex): void {
  const validator = state.validatorRegistry[index];
  validator.withdrawableEpoch = getCurrentEpoch(state) + MIN_VALIDATOR_WITHDRAWAL_DELAY;
}
