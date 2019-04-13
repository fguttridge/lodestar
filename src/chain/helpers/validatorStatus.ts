import assert from "assert";

import {
  BeaconState, CommitteeAssignment, Epoch, Shard,
  ValidatorIndex,
} from "../../types";

import {
  GENESIS_EPOCH,
  INITIATED_EXIT,
  LATEST_SLASHED_EXIT_LENGTH,
  MIN_VALIDATOR_WITHDRAWAL_DELAY, SLOTS_PER_EPOCH,
  WHISTLEBLOWER_REWARD_QUOTIENT,
} from "../../constants";

import {
  getBeaconProposerIndex, getCrosslinkCommitteesAtSlot,
  getCurrentEpoch,
  getEffectiveBalance,
  getEntryExitEffectEpoch,
  getEpochStartSlot, getPreviousEpoch,
} from "./stateTransitionHelpers";
import RPCProvider from "../../validator/stubs/rpc";

/**
 * Activate a validator given an index.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 * @param {boolean} isGenesis
 */
export function activateValidator(state: BeaconState, index: ValidatorIndex, isGenesis: boolean): void {
  const validator = state.validatorRegistry[index];
  validator.activationEpoch = isGenesis ? GENESIS_EPOCH : getEntryExitEffectEpoch(getCurrentEpoch(state));
}

/**
 * Initiate exit for the validator with the given index.
 * Note: that this function mutates state.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 */
export function initiateValidatorExit(state: BeaconState, index: ValidatorIndex): void {
  // TODO: Unsafe usage of toNumber for index
  const validator = state.validatorRegistry[index];
  validator.statusFlags = validator.statusFlags.or(INITIATED_EXIT);
}
/**
 * Exit the validator of the given ``index``.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 */
export function exitValidator(state: BeaconState, index: ValidatorIndex): void {
  const validator = state.validatorRegistry[index];

  // The following updates only occur if not previously exited
  const entryExitEffectEpoch = getEntryExitEffectEpoch(getCurrentEpoch(state));
  if (validator.exitEpoch <= entryExitEffectEpoch) {
    return;
  }

  validator.exitEpoch = entryExitEffectEpoch;
}

/**
 * Slash the validator with index ``index``.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 */
export function slashValidator(state: BeaconState, index: ValidatorIndex): void {
  const validator = state.validatorRegistry[index];
  const currentEpoch = getCurrentEpoch(state);
  // Remove assertion in phase 2
  assert(state.slot < getEpochStartSlot(validator.withdrawalEpoch));

  exitValidator(state, index);
  state.latestSlashedBalances[currentEpoch % LATEST_SLASHED_EXIT_LENGTH] =
    state.latestSlashedBalances[currentEpoch % LATEST_SLASHED_EXIT_LENGTH].add(getEffectiveBalance(state, index));

  const whistleblowerIndex = getBeaconProposerIndex(state, state.slot);
  const whistleblowerReward = getEffectiveBalance(state, index).divn(WHISTLEBLOWER_REWARD_QUOTIENT);
  state.validatorBalances[whistleblowerIndex] =
    state.validatorBalances[whistleblowerIndex].add(whistleblowerReward);
  state.validatorBalances[index] =
    state.validatorBalances[index].sub(whistleblowerReward);

  validator.slashedEpoch = currentEpoch;
  validator.withdrawalEpoch = currentEpoch + LATEST_SLASHED_EXIT_LENGTH;
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
  validator.withdrawalEpoch = getCurrentEpoch(state) + MIN_VALIDATOR_WITHDRAWAL_DELAY;
}

/**
 * Return the committee assignment in the ``epoch`` for ``validator_index`` and ``registry_change``.
 * ``assignment`` returned is a tuple of the following form:
 * ``assignment[0]`` is the list of validators in the committee
 * ``assignment[1]`` is the shard to which the committee is assigned
 * ``assignment[2]`` is the slot at which the committee is assigned
 * ``assignment[3]`` is a bool signalling if the validator is expected to propose
 * a beacon block at the assigned slot.
 * @param {BeaconState} state
 * @param {Epoch} epoch
 * @param {ValidatorIndex} validatorIndex
 * @param {boolean} registryChange
 * @returns {{validators: ValidatorIndex[]; shard: Shard; slot: number; isProposer: boolean}}
 */
export function getCommitteeAssignment(
  state: BeaconState,
  epoch: Epoch,
  validatorIndex: ValidatorIndex): CommitteeAssignment {

  const previousEpoch = getPreviousEpoch(state);
  const nextEpoch = getCurrentEpoch(state) + 1;
  assert(previousEpoch <= epoch && epoch <= nextEpoch);

  const epochStartSlot = getEpochStartSlot(epoch);
  const loopEnd = epochStartSlot + SLOTS_PER_EPOCH;

  for (let slot = epochStartSlot; slot < loopEnd; slot++) {
    const crosslinkCommittees = getCrosslinkCommitteesAtSlot(state, slot);
    const selectedCommittees = crosslinkCommittees.map((committee) => committee[0].contains(validatorIndex))

    if (selectedCommittees.length > 0) {
      const validators = selectedCommittees[0][0];
      const shard = selectedCommittees[0][1];
      return {validators, shard, slot};
    }
  }
}
