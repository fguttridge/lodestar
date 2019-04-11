// Each type exported here contains both a compile-time type (a typescript interface) and a run-time ssz type (a javascript variable)
// For more information, see ./index.ts
import { SimpleContainerType } from "@chainsafe/ssz";

import {
  bool,
  bytes,
  bytes32,
  bytes96,
  uint64,
  bytes4,
  Epoch,
  Shard,
  Slot,
  ValidatorIndex,
  number64,
  bytes48,
} from "./primitive";

import { SLOTS_PER_HISTORICAL_ROOT } from "../constants";

export interface Fork {
  // Previous fork version
  previousVersion: bytes4;
  // Post fork version
  currentVersion: bytes4;
  // Fork epoch number
  epoch: Epoch;
}
export const Fork: SimpleContainerType = {
  name: "Fork",
  fields: [
    ["previousVersion", bytes4],
    ["currentVersion", bytes4],
    ["epoch", Epoch],
  ],
};

export interface Crosslink {
  // Epoch number
  epoch: Epoch;
  // Shard data since the previous crosslink
  crosslinkDataRoot: bytes32;
}

export const Crosslink: SimpleContainerType = {
  name: "Crosslink",
  fields: [
    ["epoch", Epoch],
    ["crosslinkDataRoot", bytes32],
  ],
};

export interface Eth1Data {
  // Root of the deposit tree
  depositRoot: bytes32;
  // Total number of deposits
  depositCount: number64;
  // Block hash
  blockHash: bytes32;
}
export const Eth1Data: SimpleContainerType = {
  name: "Eth1Data",
  fields: [
    ["depositRoot", bytes32],
    ["depositCount", number64],
    ["blockHash", bytes32],
  ],
};

export interface Eth1DataVote {
  // Data being voted for
  eth1Data: Eth1Data;
  // Vote count
  voteCount: number64;
}
export const Eth1DataVote: SimpleContainerType = {
  name: "Eth1DataVote",
  fields: [
    ["eth1Data", Eth1Data],
    ["voteCount", number64],
  ],
};

export interface AttestationData {
  // LMD GHOST vote
  slot: Slot;
  beaconBlockRoot: bytes32;
  // FFG vote
  sourceEpoch: Epoch;
  sourceRoot: bytes32;
  targetRoot: bytes32;
  // Crosslink vote
  shard: Shard;
  previousCrosslink: Crosslink;
  crosslinkDataRoot: bytes32;
}
export const AttestationData: SimpleContainerType = {
  name: "AttestationData",
  fields: [
    ["slot", Slot],
    ["beaconBlockRoot", bytes32],
    ["sourceEpoch", Epoch],
    ["sourceRoot", bytes32],
    ["targetRoot", bytes32],
    ["shard", Shard],
    ["previousCrosslink", Crosslink],
    ["crosslinkDataRoot", bytes32],
  ],
};

export interface AttestationDataAndCustodyBit {
  // Attestation data
  data: AttestationData;
  // Custody bit
  custodyBit: bool;
}
export const AttestationDataAndCustodyBit: SimpleContainerType = {
  name: "AttestationDataAndCustodyBit",
  fields: [
    ["data", AttestationData],
    ["custodyBit", bool],
  ],
};

export interface IndexedAttestation {
  // Validator Indices
  custodyBit0Indices: ValidatorIndex[];
  custodyBit1Indices: ValidatorIndex[];
  // Attestation Data
  data: AttestationData;
  // Aggregate signature
  aggregateSignature: bytes96;
}
export const IndexedAttestation: SimpleContainerType = {
  name: "IndexedAttestation",
  fields: [
    ["custodyBit0Indices", [ValidatorIndex]],
    ["custodyBit1Indices", [ValidatorIndex]],
    ["data", AttestationData],
    ["aggregateSignature", bytes96],
  ],
};

export interface DepositData {
  // BLS pubkey
  pubkey: bytes48;
  // Withdrawal credentials
  withdrawalCredentials: bytes32;
  // Amount in Gwei
  amount: uint64;
  // BLS proof of possession (a BLS signature)
  proofOfPossession: bytes96;
}
export const DepositData: SimpleContainerType = {
  name: "DepositData",
  fields: [
    ["pubkey", bytes48],
    ["withdrawalCredentials", bytes32],
    ["amount", uint64],
    ["proofOfPossession", bytes96],
  ],
};

export interface BeaconBlockHeader {
  slot: Slot;
  previousBlockRoot: bytes32;
  stateRoot: bytes32;
  blockBodyRoot: bytes32;
  signature: bytes96;
}
export const BeaconBlockHeader: SimpleContainerType = {
  name: "BeaconBlockHeader",
  fields: [
    ["slot", Slot],
    ["previousBlockRoot", bytes32],
    ["stateRoot", bytes32],
    ["blockBodyRoot", bytes32],
    ["signature", bytes96],
  ],
};

export interface Validator {
  // BLS public key
  pubkey: bytes48;
  // Withdrawal credentials
  withdrawalCredentials: bytes32;
  // Epoch when validator activated
  activationEpoch: Epoch;
  // Slot when validator exited
  exitEpoch: Epoch;
  // Slot when validator withdrew
  withdrawableEpoch: Epoch;
  // Did the validator initiate an exit
  initiatedExit: bool;
  // Was the validator slashed
  slashed: bool;
  // Rounded balance
  highBalance: uint64;
}
export const Validator: SimpleContainerType = {
  name: "Validator",
  fields: [
    ["pubkey", bytes48],
    ["withdrawalCredentials", bytes32],
    ["activationEpoch", Epoch],
    ["exitEpoch", Epoch],
    ["withdrawableEpoch", Epoch],
    ["initiatedExit", bool],
    ["slashed", bool],
    ["highBalance", uint64],
  ],
};

export interface PendingAttestation {
  // Proof of custody bitfield
  aggregationBitfield: bytes;
  // Signed data
  data: AttestationData;
  // Attester participation bitfield
  custodyBitfield: bytes;
  // Slot in which it was included
  inclusionSlot: Slot;
}
export const PendingAttestation: SimpleContainerType = {
  name: "PendingAttestation",
  fields: [
    ["aggregationBitfield", bytes],
    ["data", AttestationData],
    ["custodyBitfield", bytes],
    ["inclusionSlot", Slot],
  ],
};

export interface HistoricalBatch {
  // Block roots
  blockRoots: bytes32[];
  // State roots
  stateRoots: bytes32[];
}
export const HistoricalBatch: SimpleContainerType = {
  name: "HistoricalBatch",
  fields: [
    ["blockRoots", [bytes32, SLOTS_PER_HISTORICAL_ROOT]],
    ["stateRoots", [bytes32, SLOTS_PER_HISTORICAL_ROOT]],
  ],
};

