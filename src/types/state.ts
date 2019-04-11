// Each type exported here contains both a compile-time type (a typescript interface) and a run-time ssz type (a javascript variable)
// For more information, see ./index.ts
import { SimpleContainerType } from "@chainsafe/ssz";

import {
  LATEST_ACTIVE_INDEX_ROOTS_LENGTH,
  LATEST_RANDAO_MIXES_LENGTH,
  LATEST_SLASHED_EXIT_LENGTH,
  SLOTS_PER_HISTORICAL_ROOT,
  SHARD_COUNT,
} from "../constants";

import {
  bytes32,
  number64,
  uint64,
  Epoch,
  Shard,
  Slot,
} from "./primitive";

import {
  BeaconBlockHeader,
  Crosslink,
  Eth1Data,
  Eth1DataVote,
  Fork,
  PendingAttestation,
  Validator,
} from "./misc";


export interface BeaconState {
  // Misc
  slot: Slot;
  genesisTime: number64;
  fork: Fork; // For versioning hard forks

  // Validator registry
  validatorRegistry: Validator[];
  balances: uint64[];
  validatorRegistryUpdateEpoch: Epoch;

  // Randomness and committees
  latestRandaoMixes: bytes32[];
  latestStartShard: Shard;

  // Finality
  previousEpochAttestations: PendingAttestation[];
  currentEpochAttestations: PendingAttestation[];
  previousJustifiedEpoch: Epoch;
  currentJustifiedEpoch: Epoch;
  previousJustifiedRoot: bytes32;
  currentJustifiedRoot: bytes32;
  justificationBitfield: uint64;
  finalizedEpoch: Epoch;
  finalizedRoot: bytes32;

  // Recent state
  latestCrosslinks: Crosslink[];
  latestBlockRoots: bytes32[];
  latestStateRoots: bytes32[];
  latestActiveIndexRoots: bytes32[];
  latestSlashedBalances: uint64[]; // Balances penalized at every withdrawal period
  latestBlockHeader: BeaconBlockHeader; //  `latest_block_header.state_root == ZERO_HASH` temporarily
  historicalRoots: bytes32[];

  // Ethereum 1.0 deposit root
  latestEth1Data: Eth1Data;
  eth1DataVotes: Eth1DataVote[];
  depositIndex: number64;
}
export const BeaconState: SimpleContainerType = {
  name: "BeaconState",
  fields: [
    // Misc
    ["slot", Slot],
    ["genesisTime", number64],
    ["fork", Fork],
    // Validator Registry
    ["validatorRegistry", [Validator]],
    ["balances", [uint64]],
    ["validatorRegistryUpdateEpoch", Epoch],
    // Randomness and committees
    ["latestRandaoMixes", [bytes32, LATEST_RANDAO_MIXES_LENGTH]],
    ["latestStartShard", Shard],
    // Finality
    ["previousEpochAttestations", [PendingAttestation]],
    ["currentEpochAttestations", [PendingAttestation]],
    ["previousJustifiedEpoch", Epoch],
    ["currentJustifiedEpoch", Epoch],
    ["previousJustifiedRoot", bytes32],
    ["currentJustifiedRoot", bytes32],
    ["justificationBitfield", uint64],
    ["finalizedEpoch", Epoch],
    ["finalizedRoot", bytes32],
    // Recent State
    ["latestCrosslinks", [Crosslink, SHARD_COUNT]],
    ["latestBlockRoots", [bytes32, SLOTS_PER_HISTORICAL_ROOT]],
    ["latestStateRoots", [bytes32, SLOTS_PER_HISTORICAL_ROOT]],
    ["latestActiveIndexRoots", [bytes32, LATEST_ACTIVE_INDEX_ROOTS_LENGTH]],
    ["latestSlashedBalances", [uint64, LATEST_SLASHED_EXIT_LENGTH]],
    ["latestBlockHeader", BeaconBlockHeader],
    ["historicalRoots", [bytes32]],
    // Eth1
    ["latestEth1Data", Eth1Data],
    ["eth1DataVotes", [Eth1DataVote]],
    ["depositIndex", number64],
  ],
};
