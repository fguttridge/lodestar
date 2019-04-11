import BN from "bn.js";

import {slotToEpoch} from "../../src/chain/helpers/stateTransitionHelpers";
import {Attestation, AttestationData, Slot, Epoch, uint64} from "../../src/types";
import {randBetween} from "./misc";

/**
 * Generates a fake attestation data for test purposes.
 * @param {number} slotValue
 * @param {number} justifiedEpochValue
 * @returns {AttestationData}
 */
export function generateAttestationData(slot: Slot, sourceEpoch: Epoch): AttestationData {
  return {
    slot,
    beaconBlockRoot: Buffer.alloc(32),
    sourceEpoch: sourceEpoch,
    sourceRoot: Buffer.alloc(32),
    targetRoot: Buffer.alloc(32),
    shard: randBetween(0, 1024),
    previousCrosslink: {
      epoch: slotToEpoch(slot),
      crosslinkDataRoot: Buffer.alloc(32),
    },
    crosslinkDataRoot: Buffer.alloc(32),
  };
}

export function generateEmptyAttestation(): Attestation {
  return {
    aggregationBitfield: Buffer.alloc(32),
    data: {
      slot: 0,
      beaconBlockRoot: Buffer.alloc(32),
      sourceEpoch: 0,
      sourceRoot: Buffer.alloc(32),
      targetRoot: Buffer.alloc(32),
      shard: randBetween(0, 1024),
      previousCrosslink: {
        epoch: 0,
        crosslinkDataRoot: Buffer.alloc(32),
      },
      crosslinkDataRoot: Buffer.alloc(32),
    },
    custodyBitfield: Buffer.alloc(32),
    aggregateSignature: Buffer.alloc(96),
  }
}
