import assert from "assert";

import {serialize} from "@chainsafe/ssz";

import {
  BeaconBlock,
  BeaconState,
  Crosslink,
  PendingAttestation,
  Attestation,
} from "../../../types";

import {
  MAX_ATTESTATIONS,
  MIN_ATTESTATION_INCLUSION_DELAY,
  SLOTS_PER_EPOCH,
  ZERO_HASH,
  GENESIS_SLOT,
  MAX_CROSSLINK_EPOCHS,
} from "../../../constants";

import {
  getCurrentEpoch,
  slotToEpoch,
  getPreviousEpoch,
  verifyIndexedAttestation,
  convertToIndexed,
} from "../../helpers/stateTransitionHelpers";


export function processAttestation(state: BeaconState, attestation: Attestation): void {
  assert(Math.max(GENESIS_SLOT, state.slot - SLOTS_PER_EPOCH) <= attestation.data.slot);
  assert(attestation.data.slot <= state.slot - MIN_ATTESTATION_INCLUSION_DELAY);

  // Check target epoch, source epoch, and source root
  const currentEpoch = getCurrentEpoch(state);
  const previousEpoch = getPreviousEpoch(state);
  const targetEpoch = slotToEpoch(attestation.data.slot);
  assert(
    currentEpoch === targetEpoch ||
    previousEpoch === targetEpoch
  );
  assert(
    state.currentJustifiedEpoch === attestation.data.sourceEpoch ||
    state.previousJustifiedEpoch === attestation.data.sourceEpoch
  );
  assert(
    state.currentJustifiedRoot.equals(attestation.data.sourceRoot) ||
    state.previousJustifiedRoot.equals(attestation.data.sourceRoot)
  );

  // Check crosslink data
  assert(attestation.data.crosslinkDataRoot.equals(ZERO_HASH)) // TO BE REMOVED IN PHASE 1

  const serializedCrosslink = serialize(state.latestCrosslinks[attestation.data.shard], Crosslink);
  assert(
    serializedCrosslink.equals( // Case 1: latest crosslink matches previous crosslink
      serialize(attestation.data.previousCrosslink, Crosslink)) ||
    serialize(state.latestCrosslinks[attestation.data.shard], Crosslink).equals( // Case 2: latest crosslink matches current crosslink
      serialize({
        crosslinkDataRoot: attestation.data.crosslinkDataRoot,
        epoch: Math.min(slotToEpoch(attestation.data.slot), attestation.data.previousCrosslink.epoch + MAX_CROSSLINK_EPOCHS)
      }, Crosslink)));

  // Check signature and bitfields
  assert(verifyIndexedAttestation(state, convertToIndexed(state, attestation)));

  // Cache pending attestation
  const pendingAttestation: PendingAttestation = {
    data: attestation.data,
    aggregationBitfield: attestation.aggregationBitfield,
    custodyBitfield: attestation.custodyBitfield,
    inclusionSlot: state.slot,
  };

  if (targetEpoch === currentEpoch) {
    state.currentEpochAttestations.push(pendingAttestation);
  } else {
    state.previousEpochAttestations.push(pendingAttestation);
  }
}

export default function processAttestations(state: BeaconState, block: BeaconBlock): void {
  assert(block.body.attestations.length <= MAX_ATTESTATIONS);
  for (const attestation of block.body.attestations) {
    processAttestation(state, attestation);
  }
}
