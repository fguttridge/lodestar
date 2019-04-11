// Each type exported here contains both a compile-time type (a typescript interface) and a run-time type (a javascript variable)
// For more information, see ./index.ts
import { SimpleContainerType } from "@chainsafe/ssz";

import { DEPOSIT_CONTRACT_TREE_DEPTH } from "../constants";

import {
  bytes,
  bytes32,
  bytes48,
  bytes96,
  number64,
  uint64,
  Epoch,
  Slot,
  ValidatorIndex,
} from "./primitive";

import {
  AttestationData,
  BeaconBlockHeader,
  DepositData,
  IndexedAttestation,
} from "./misc";


export interface ProposerSlashing {
  // Proposer index
  proposerIndex: ValidatorIndex;
  // First block header
  header1: BeaconBlockHeader;
  // Second block header
  header2: BeaconBlockHeader;
}
export const ProposerSlashing: SimpleContainerType = {
  name: "ProposerSlashing",
  fields: [
    ["proposerIndex", ValidatorIndex],
    ["header1", BeaconBlockHeader],
    ["header2", BeaconBlockHeader],
  ],
};

export interface AttesterSlashing {
  // First attestation
  attestation1: IndexedAttestation;
  // Second attestation
  attestation2: IndexedAttestation;
}
export const AttesterSlashing: SimpleContainerType = {
  name: "AttesterSlashing",
  fields: [
    ["attestation1", IndexedAttestation],
    ["attestation2", IndexedAttestation],
  ],
};

export interface Attestation {
  // Attester participation bitfield
  aggregationBitfield: bytes;
  // Attestation data
  data: AttestationData;
  // Proof of custody bitfield
  custodyBitfield: bytes;
  // BLS aggregate signature
  aggregateSignature: bytes96;
}
export const Attestation: SimpleContainerType = {
  name: "Attestation",
  fields: [
    ["aggregationBitfield", bytes],
    ["data", AttestationData],
    ["custodyBitfield", bytes],
    ["aggregateSignature", bytes96],
  ],
};

export interface Deposit {
  // Branch in the deposit tree
  proof: bytes32[];
  // index in the deposit tree
  index: number64;
  // Deposit data
  data: DepositData;
}
export const Deposit: SimpleContainerType = {
  name: "Deposit",
  fields: [
    ["proof", [bytes32, DEPOSIT_CONTRACT_TREE_DEPTH]],
    ["index", number64],
    ["data", DepositData],
  ],
};

export interface VoluntaryExit {
  // Minimum slot for processing exit
  epoch: Epoch;
  // Index of the exiting validator
  validatorIndex: ValidatorIndex;
  // Validator signature
  signature: bytes96;
}
export const VoluntaryExit: SimpleContainerType = {
  name: "VoluntaryExit",
  fields: [
    ["epoch", Epoch],
    ["validatorIndex", ValidatorIndex],
    ["signature", bytes96],
  ],
};

export interface Transfer {
  // Sender index
  sender: ValidatorIndex;
  // Recipient index
  recipient: ValidatorIndex;
  // Amount in Gwei
  amount: uint64;
  // Fee in Gwei for block proposer
  fee: uint64;
  // Inclusion slot
  slot: Slot;
  // Sender withdrawal pubkey
  pubkey: bytes48;
  // Sender signature
  signature: bytes96;
}

export const Transfer: SimpleContainerType = {
  name: "Transfer",
  fields: [
    ["sender", ValidatorIndex],
    ["recipient", ValidatorIndex],
    ["amount", uint64],
    ["fee", uint64],
    ["slot", Slot],
    ["pubkey", bytes48],
    ["signature", bytes96],
  ],
};
