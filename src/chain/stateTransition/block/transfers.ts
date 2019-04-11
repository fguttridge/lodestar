import assert from "assert";

import {signingRoot} from "@chainsafe/ssz";

import {
  BeaconBlock,
  BeaconState,
  Transfer,
} from "../../../types";

import {
  BLS_WITHDRAWAL_PREFIX_BYTE,
  Domain,
  MAX_TRANSFERS,
  MIN_DEPOSIT_AMOUNT,
  FAR_FUTURE_EPOCH,
} from "../../../constants";

import {
  getBeaconProposerIndex,
  getCurrentEpoch,
  getDomain,
  hash,
  slotToEpoch,
  getBalance,
  decreaseBalance,
  increaseBalance,
} from "../../helpers/stateTransitionHelpers";

import { blsVerify } from "../../../stubs/bls";

/**
 * Process ``Transfer`` operation.
 * Note that this function mutates ``state``.
 * @param {BeaconState} state
 * @param {Transfer} transfer
 */
export function processTransfer(state: BeaconState, transfer: Transfer): void {
  // Verify the amount and fee aren't individually too big (for anti-overflow purposes)
  const senderBalance = getBalance(state, transfer.sender);
  assert(senderBalance.gte(transfer.amount));
  assert(senderBalance.gte(transfer.fee));
  // Verify that we have enough ETH to send, and that after the transfer the balance will be either
  // exactly zero or at least MIN_DEPOSIT_AMOUNT
  assert(
    senderBalance.eq(transfer.amount.add(transfer.fee)) ||
    senderBalance.gte(transfer.amount.add(transfer.fee).addn(MIN_DEPOSIT_AMOUNT))
  );
  // A transfer is valid in only one slot
  assert(state.slot === transfer.slot);
  // Only withdrawn or not-yet-deposited accounts can transfer
  assert(
    getCurrentEpoch(state) >= state.validatorRegistry[transfer.sender].withdrawableEpoch ||
    state.validatorRegistry[transfer.sender].activationEpoch === FAR_FUTURE_EPOCH
  );
  // Verify that the pubkey is valid
  assert(state.validatorRegistry[transfer.sender].withdrawalCredentials.equals(
    Buffer.concat([BLS_WITHDRAWAL_PREFIX_BYTE, hash(transfer.pubkey).slice(1)])));
  // Verify that the signature is valid
  assert(blsVerify(
    transfer.pubkey,
    signingRoot(transfer, Transfer),
    transfer.signature,
    getDomain(state.fork, slotToEpoch(transfer.slot), Domain.TRANSFER),
  ));
  // Process the transfer
  decreaseBalance(state, transfer.sender, transfer.amount.add(transfer.fee));
  increaseBalance(state, transfer.recipient, transfer.amount);
  increaseBalance(state, getBeaconProposerIndex(state, state.slot), transfer.fee);
}

export default function processTransfers(state: BeaconState, block: BeaconBlock): void {
  // Note: Transfers are a temporary functionality for phases 0 and 1, to be removed in phase 2.
  assert(block.body.transfers.length <= MAX_TRANSFERS);
  for (const transfer of block.body.transfers) {
    processTransfer(state, transfer);
  }
}
