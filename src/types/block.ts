// Each type exported here contains both a compile-time type (a typescript interface) and a run-time ssz type (a javascript variable)
// For more information, see ./index.ts
import { SimpleContainerType } from "@chainsafe/ssz";

import {
  bytes32,
  bytes96,
  Shard,
  Slot,
  ValidatorIndex,
} from "./primitive";

import { Eth1Data } from "./misc";

import {
  Attestation,
  AttesterSlashing,
  Deposit,
  ProposerSlashing,
  Transfer,
  VoluntaryExit,
} from "./operations";


export interface BeaconBlockBody {
  randaoReveal: bytes96;
  eth1Data: Eth1Data;
  proposerSlashings: ProposerSlashing[];
  attesterSlashings: AttesterSlashing[];
  attestations: Attestation[];
  deposits: Deposit[];
  voluntaryExits: VoluntaryExit[];
  transfers: Transfer[];
}
export const BeaconBlockBody: SimpleContainerType = {
  name: "BeaconBlockBody",
  fields: [
    ["randaoReveal", bytes96],
    ["eth1Data", Eth1Data],
    ["proposerSlashings", [ProposerSlashing]],
    ["attesterSlashings", [AttesterSlashing]],
    ["attestations", [Attestation]],
    ["deposits", [Deposit]],
    ["voluntaryExits", [VoluntaryExit]],
    ["transfers", [Transfer]],
  ],
};

export interface BeaconBlock {
  // Header
  slot: Slot;
  previousBlockRoot: bytes32;
  stateRoot: bytes32;
  body: BeaconBlockBody;
  signature: bytes96;
}
export const BeaconBlock: SimpleContainerType = {
  name: "BeaconBlock",
  fields: [
    ["slot", Slot],
    ["previousBlockRoot", bytes32],
    ["stateRoot", bytes32],
    ["body", BeaconBlockBody],
    ["signature", bytes96],
  ],
};

export interface CrosslinkCommittee {
  shard: Shard;
  validatorIndices: ValidatorIndex[];
}
export const CrosslinkCommittee: SimpleContainerType = {
  name: "CrosslinkCommittee",
  fields: [
    ["shard", Shard],
    ["validatorIndices", [ValidatorIndex]],
  ],
};
