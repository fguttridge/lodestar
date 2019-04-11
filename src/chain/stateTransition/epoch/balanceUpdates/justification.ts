import {isActiveValidator, getCurrentEpoch, getBeaconProposerIndex} from "../../../helpers/stateTransitionHelpers";
import {MIN_ATTESTATION_INCLUSION_DELAY, PROPOSER_REWARD_QUOTIENT} from "../../../../constants";
import {BeaconState, Gwei} from "../../../../types";
import BN from "bn.js";
import {inclusionDistance, getPreviousEpochBoundaryAttestations, getAttestingBalance, getPreviousTotalBalance, getPreviousEpochMatchingHeadAttestations, getAttestingIndices, getBaseReward, getInactivityPenalty, inclusionSlot} from "../helpers";

export function getJustificationAndFinalizationDeltas(state: BeaconState): [Gwei[], Gwei[]] {
  const currentEpoch = getCurrentEpoch(state);
  const epochsSinceFinality = currentEpoch + 1 - state.finalizedEpoch;
  const rewards = Array.from({length: state.validatorRegistry.length}, () => new BN(0));
  const penalties = Array.from({length: state.validatorRegistry.length}, () => new BN(0));
  const boundaryAttestations = getPreviousEpochBoundaryAttestations(state);
  const boundaryAttestingBalance = getAttestingBalance(state, boundaryAttestations);
  const totalBalance = getPreviousTotalBalance(state);
  const totalAttestingBalance = getAttestingBalance(state, state.previousEpochAttestations);
  const matchingHeadAttestations = getPreviousEpochMatchingHeadAttestations(state);
  const matchingHeadBalance = getAttestingBalance(state, matchingHeadAttestations);
  const eligibleValidators = state.validatorRegistry
    .map((v, index) => (isActiveValidator(v, currentEpoch) || (v.slashed && currentEpoch < v.withdrawableEpoch))
      ? index
      : undefined)
    .filter(i => i !== undefined);

  const previousEpochAttestingIndices = getAttestingIndices(state, state.previousEpochAttestations);
  const boundaryAttestingIndices = getAttestingIndices(state, boundaryAttestations);
  const matchingHeadAttestingIndices = getAttestingIndices(state, matchingHeadAttestations);
  eligibleValidators.forEach((index) => {
    const baseReward = getBaseReward(state, index);
    // Expected FFG Source
    if (previousEpochAttestingIndices.includes(index)) {
      rewards[index] = rewards[index].add(
        baseReward.mul(totalAttestingBalance).div(totalBalance));
      // Inclusion speed bonus
      rewards[index] = rewards[index].add(
        baseReward.muln(MIN_ATTESTATION_INCLUSION_DELAY).divn(inclusionDistance(state, index)));
    } else {
      penalties[index] = penalties[index].add(baseReward);
    }
    // Expected FFG target
    if (boundaryAttestingIndices.includes(index)) {
      rewards[index] = rewards[index].add(
        baseReward.mul(boundaryAttestingBalance).div(totalBalance));
    } else {
      penalties[index] = penalties[index].add(
        getInactivityPenalty(state, index, epochsSinceFinality));
    }
    // Expected head
    if (matchingHeadAttestingIndices.includes(index)) {
      rewards[index] = rewards[index].add(
        baseReward.mul(matchingHeadBalance).div(totalBalance));
    } else {
      penalties[index] = penalties[index].add(baseReward);
    }
    // Proposer bonus
    if (previousEpochAttestingIndices.includes(index)) {
      const proposerIndex = getBeaconProposerIndex(state, inclusionSlot(state, index));
      rewards[proposerIndex] = rewards[proposerIndex].add(
        baseReward.divn(PROPOSER_REWARD_QUOTIENT));
    }
    // Take away max rewards if we're not finalizing
    if (epochsSinceFinality > 4) {
      penalties[index] = penalties[index].add(
        baseReward.muln(4));
    }
  });
  return [rewards, penalties];
}
