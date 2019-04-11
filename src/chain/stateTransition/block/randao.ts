import assert from "assert";
import xor from "buffer-xor";

import {
  BeaconBlock,
  BeaconState,
  Epoch,
} from "../../../types";

import {
  Domain,
  LATEST_RANDAO_MIXES_LENGTH,
} from "../../../constants";

import {
  getBeaconProposerIndex,
  getCurrentEpoch,
  getDomain,
  getRandaoMix,
  hash,
} from "../../helpers/stateTransitionHelpers";

import {blsVerify} from "../../../stubs/bls";
import { hashTreeRoot } from "@chainsafe/ssz";

export default function processRandao(state: BeaconState, block: BeaconBlock): void {
  const currentEpoch = getCurrentEpoch(state);
  const proposer = state.validatorRegistry[getBeaconProposerIndex(state, state.slot)];

  // Verify that the provided randao value is valid
  const randaoRevealVerified = blsVerify(
    proposer.pubkey,
    hashTreeRoot(getCurrentEpoch(state), Epoch),
    block.body.randaoReveal,
    getDomain(state.fork, currentEpoch, Domain.RANDAO),
  );
  assert(randaoRevealVerified);

  // Mix it in
  state.latestRandaoMixes[currentEpoch % LATEST_RANDAO_MIXES_LENGTH] =
    xor(getRandaoMix(state, currentEpoch), hash(block.body.randaoReveal));
}
