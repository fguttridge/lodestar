import BN from "bn.js";
import { deserialize, serialize } from "@chainsafe/ssz"
import {
  getActiveValidatorIndices, getAttestationParticipants, getCurrentEpoch,
  getEffectiveBalance, getTotalBalance, getPreviousEpoch, getBlockRoot, getEpochStartSlot, bnSqrt
} from "../../helpers/stateTransitionHelpers";
import {
  BeaconState, bytes32, CrosslinkCommittee, number64, PendingAttestation,
  Shard, Slot, ValidatorIndex, Gwei, Crosslink,
} from "../../../types";
import {
  ZERO_HASH,
  BASE_REWARD_QUOTIENT,
  INACTIVITY_PENALTY_QUOTIENT
} from "../../../constants";


export function getCurrentTotalBalance(state: BeaconState): Gwei {
  return getTotalBalance(state, getActiveValidatorIndices(state.validatorRegistry, getCurrentEpoch(state)));
}

export function getPreviousTotalBalance(state: BeaconState): Gwei {
  return getTotalBalance(state, getActiveValidatorIndices(state.validatorRegistry, getPreviousEpoch(state)));
}

export function getAttestingIndices(state: BeaconState, attestations: PendingAttestation[]): ValidatorIndex[] {
  const output = new Set();
  attestations.forEach((a) =>
    getAttestationParticipants(state, a.data, a.aggregationBitfield).forEach((index) =>
      output.add(index)))
  return [...output.values()].sort();
}

export function getAttestingBalance(state: BeaconState, attestations: PendingAttestation[]): Gwei {
  return getTotalBalance(state, getAttestingIndices(state, attestations));
}

export function getCurrentEpochBoundaryAttestations(state: BeaconState): PendingAttestation[] {
  const blockRoot = getBlockRoot(state, getEpochStartSlot(getCurrentEpoch(state)));
  return state.currentEpochAttestations
    .filter((a) => a.data.targetRoot.equals(blockRoot));
}

export function getPreviousEpochBoundaryAttestations(state: BeaconState): PendingAttestation[] {
  const blockRoot = getBlockRoot(state, getEpochStartSlot(getPreviousEpoch(state)));
  return state.previousEpochAttestations
    .filter((a) => a.data.targetRoot.equals(blockRoot));
}

export function getPreviousEpochMatchingHeadAttestations(state: BeaconState): PendingAttestation[] {
  return state.previousEpochAttestations
    .filter((a) => a.data.beaconBlockRoot.equals(getBlockRoot(state, a.data.slot)));
}

export function getWinningRootAndParticipants(state: BeaconState, shard: Shard): [bytes32, ValidatorIndex[]] {
  const validAttestations = state.currentEpochAttestations.concat(state.previousEpochAttestations)
    .filter((a) =>
      serialize(a.data.previousCrosslink, Crosslink).equals(
        serialize(state.latestCrosslinks[shard], Crosslink)));

  const allRoots = validAttestations.map((a) => a.data.crosslinkDataRoot);

  if (allRoots.length === 0) {
    return [ZERO_HASH, []];
  }
  
  const getAttestationsFor = (root: bytes32) => 
    validAttestations.filter((a) => a.data.crosslinkDataRoot.equals(root));

  const winningRoot = allRoots
    .map((root) => ({
      root,
      balance: getAttestingBalance(
        state,
        getAttestationsFor(root),
      ),
    }))
    .reduce((a, b) => {
      if (b.balance.gt(a.balance)) {
        return b;
      } else if (b.balance.eq(a.balance)) {
        if (deserialize(b.root, "uint32") < deserialize(a.root, "uint32")) {
          return b;
        }
      }
      return a;
    }).root;

  return [winningRoot, getAttestingIndices(state, getAttestationsFor(winningRoot))];
}

export function earliestAttestation(state: BeaconState, validatorIndex: ValidatorIndex): PendingAttestation {
  return state.previousEpochAttestations
    .filter((a) => getAttestationParticipants(state, a.data, a.aggregationBitfield).includes(validatorIndex))
    .reduce((a, b) => a.inclusionSlot < b.inclusionSlot ? a : b);
}

/**
 * Returns the attestation with the lowest inclusion slot for a specified validatorIndex.
 * @param {BeaconState} state
 * @param {ValidatorIndex} validatorIndex
 * @returns {Slot}
 */
export function inclusionSlot(state: BeaconState, validatorIndex: ValidatorIndex): Slot {
  return earliestAttestation(state, validatorIndex).inclusionSlot;
}

/**
 * Find the difference between an attestation slot and the data slot of that attestation
 * @param {BeaconState} state
 * @param {ValidatorIndex} validatorIndex
 * @returns {number64}
 */
export function inclusionDistance(state: BeaconState, validatorIndex: ValidatorIndex): number64 {
  const attestation = earliestAttestation(state, validatorIndex);
  return attestation.inclusionSlot - attestation.data.slot;
}

export function getBaseReward(state: BeaconState, index: ValidatorIndex): Gwei {
  if (getPreviousTotalBalance(state).eqn(0)) {
    return new BN(0);
  }

  const adjustedQuotient = bnSqrt(getPreviousTotalBalance(state)).divn(BASE_REWARD_QUOTIENT);
  return getEffectiveBalance(state, index).div(adjustedQuotient).divn(5);
}

export function getInactivityPenalty(state: BeaconState, index: ValidatorIndex, epochsSinceFinality: number): Gwei {
  const extraPenalty = epochsSinceFinality <= 4
    ? new BN(0)
    : getEffectiveBalance(state, index).muln(epochsSinceFinality).divn(INACTIVITY_PENALTY_QUOTIENT);
  return getBaseReward(state, index).add(extraPenalty);
}

/**
 * Returns the union of validators index sets from getAttestationParticipants
 * @param {BeaconState} state
 * @param {Shard} shard
 * @param {CrosslinkCommittee} crosslinkCommittee
 * @param {bytes32} shardBlockRoot
 * @param {PendingAttestation[]} currentEpochAttestations
 * @param {PendingAttestation[]} previousEpochAttestations
 * @returns {ValidatorIndex[]}
 */
export function attestingValidatorIndices(
  state: BeaconState,
  shard: Shard,
  crosslinkCommittee: CrosslinkCommittee,
  shardBlockRoot: bytes32,
  attestations: PendingAttestation[]): ValidatorIndex[] {

  return [
    ...new Set(
      attestations.flatMap((a: PendingAttestation) => {
        if (a.data.shard === shard) {
          return getAttestationParticipants(state,a.data, a.aggregationBitfield);
        }
      })
    )
  ]
}
