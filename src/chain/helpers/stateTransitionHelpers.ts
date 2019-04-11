import { keccakAsU8a } from "@polkadot/util-crypto";
import BN from "bn.js";
import { hashTreeRoot, serialize, signingRoot } from "@chainsafe/ssz";
import assert from "assert";


import {
  ACTIVATION_EXIT_DELAY,
  Domain,
  EMPTY_SIGNATURE,
  FAR_FUTURE_EPOCH,
  GENESIS_EPOCH,
  LATEST_ACTIVE_INDEX_ROOTS_LENGTH,
  LATEST_RANDAO_MIXES_LENGTH,
  MAX_DEPOSIT_AMOUNT,
  MIN_SEED_LOOKAHEAD,
  SHARD_COUNT,
  SLOTS_PER_EPOCH,
  TARGET_COMMITTEE_SIZE,
  ZERO_HASH,
  HIGH_BALANCE_INCREMENT,
  SHUFFLE_ROUND_COUNT,
  SLOTS_PER_HISTORICAL_ROOT,
  DEPOSIT_CONTRACT_TREE_DEPTH,
  MAX_ATTESTATION_PARTICIPANTS,
} from "../../constants";

import {
  AttestationData,
  AttestationDataAndCustodyBit,
  BLSPubkey,
  BLSSignature,
  BeaconState,
  bool,
  bytes,
  bytes32,
  CrosslinkCommittee,
  Epoch,
  Fork,
  Gwei,
  int,
  Shard,
  Slot,
  uint64,
  Validator,
  ValidatorIndex,
  number64,
  BeaconBlock,
  BeaconBlockHeader,
  BeaconBlockBody,
  bytes4,
  Attestation,
  IndexedAttestation,
  DepositData,
  Deposit,
} from "../../types";

import {
  blsAggregatePubkeys,
  blsVerifyMultiple,
  blsVerify,
} from "../../stubs/bls";
import { bnMax, bnMin } from "../../helpers/math";


/**
 * Return the block header corresponding to a block with ``state_root`` set to ``ZERO_HASH``.
 * @param {BeaconBlock} block
 * @returns {BeaconBlockHeader}
 */
export function getTemporaryBlockHeader(block: BeaconBlock): BeaconBlockHeader {
  return {
    slot: block.slot,
    previousBlockRoot: block.previousBlockRoot,
    stateRoot: ZERO_HASH,
    blockBodyRoot: hashTreeRoot(block.body, BeaconBlockBody),
    // signing_root(block) is used for block id purposes so signature is a stub
    signature: EMPTY_SIGNATURE,
  }
}

// This function was copied from ssz-js
// TODO: either export hash from ssz-js or move to a util-crypto library
export function hash(value: bytes): bytes32 {
  return Buffer.from(keccakAsU8a(value));
}

/**
 * Return a byte array from an int
 * @param {BN | number} value
 * @param {number} length
 * @returns {bytes}
 */
export function intToBytes(value: BN | number, length: number): bytes {
  if (BN.isBN(value)) { // value is BN
    return value.toArrayLike(Buffer, "le", length);
  } else if (length <= 6) { // value is a number and length is at most 6 bytes
    const b = Buffer.alloc(length);
    b.writeUIntLE(value, 0, length);
    return b;
  } else { // value is number and length is too large for Buffer#writeUIntLE
    value = new BN(value)
    return value.toArrayLike(Buffer, "le", length);
  }
}

export function bytesToBN(value: Buffer): BN {
  return new BN(value, 'le');
}

export function intDiv(dividend: number, divisor: number): number {
  return Math.floor(dividend / divisor);
}

/**
 * Return the epoch number of the given slot.
 * @param {Slot} slot
 * @returns {Epoch}
 */
export function slotToEpoch(slot: Slot): Epoch {
  return Math.floor(slot / SLOTS_PER_EPOCH);
}

/**
 * Return the current epoch of the given state.
 * @param {BeaconState} state
 * @returns {Epoch}
 */
export function getCurrentEpoch(state: BeaconState): Epoch {
  return slotToEpoch(state.slot);
}

/**
 * Return the previous epoch of the given state.
 * @param {BeaconState} state
 * @returns {Epoch}
 */
export function getPreviousEpoch(state: BeaconState): Epoch {
  const currentEpoch = getCurrentEpoch(state);
  if (currentEpoch == GENESIS_EPOCH) {
    return GENESIS_EPOCH;
  }
  return currentEpoch - 1;
}

/**
 * Return the starting slot of the given epoch.
 * @param {Epoch} epoch
 * @returns {Slot}
 */
export function getEpochStartSlot(epoch: Epoch): Slot {
  return epoch * SLOTS_PER_EPOCH;
}

/**
 * Check if validator is active
 * @param {Validator} validator
 * @param {Epoch} epoch
 * @returns {boolean}
 */
export function isActiveValidator(validator: Validator, epoch: Epoch): boolean {
  return validator.activationEpoch <= epoch && epoch < validator.exitEpoch;
}

/**
 * Check if validator is slashable
 * @param {Validator} validator
 * @param {Epoch} epoch
 * @returns {boolean}
 */
export function isSlashableValidator(validator: Validator, epoch: Epoch): boolean {
  return validator.activationEpoch <= epoch && epoch < validator.withdrawableEpoch && !validator.slashed;
}

/**
 * Get indices of active validators from validators.
 * @param {Validator[]} validators
 * @param {Epoch} epoch
 * @returns {ValidatorIndex[]}
 */
export function getActiveValidatorIndices(validators: Validator[], epoch: Epoch): ValidatorIndex[] {
  return validators.reduce((accumulator: ValidatorIndex[], validator: Validator, index: int) => {
    return isActiveValidator(validator, epoch)
      ? [...accumulator, index]
      : accumulator;
  }, []);
}

/**
 * Return the balance for a validator with the given ``index``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 * @returns {Gwei}
 */
export function getBalance(state: BeaconState, index: ValidatorIndex): Gwei {
  return state.balances[index];
}

/**
 * Set the balance for a validator with the given ``index`` in both ``BeaconState``
 * and validator's rounded balance ``high_balance``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 * @param {Gwei} balance
 */
export function setBalance(state: BeaconState, index: ValidatorIndex, balance: Gwei): void {
  const validator = state.validatorRegistry[index];
  const HALF_INCREMENT = intDiv(HIGH_BALANCE_INCREMENT, 2);
  if (validator.highBalance > balance || validator.highBalance.addn(3 * HALF_INCREMENT).lt(balance)) {
    validator.highBalance = balance.subn(balance.modn(HIGH_BALANCE_INCREMENT));
  }
  state.balances[index] = balance;
}

/**
 * Increase the balance for a validator with the given ``index`` by ``delta``.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 * @param {Gwei} delta
 */
export function increaseBalance(state: BeaconState, index: ValidatorIndex, delta: Gwei): void {
  setBalance(state, index, getBalance(state, index).add(delta));
}

/**
 * Decrease the balance for a validator with the given ``index`` by ``delta``.
 * Set to ``0`` when underflow.
 * @param {BeaconState} state
 * @param {ValidatorIndex} index
 * @param {Gwei} delta
 */
export function decreaseBalance(state: BeaconState, index: ValidatorIndex, delta: Gwei): void {
  const currentBalance = getBalance(state, index);
  setBalance(state, index, currentBalance.gte(delta) ? currentBalance.sub(delta) : new BN(0));
}

/**
 * Return `p(index)` in a pseudorandom permutation `p` of `0...list_size - 1` with ``seed`` as entropy.
 *
 * Utilizes 'swap or not' shuffling found in
 * https://link.springer.com/content/pdf/10.1007%2F978-3-642-32009-5_1.pdf
 * See the 'generalized domain' algorithm on page 3.
 * @param {number} index
 * @param {number} listSize
 * @param {seed} bytes32
 * @returns {number}
 */
export function getPermutedIndex(index: number, listSize: number, seed: bytes32): number {
  let permuted = index;
  assert(index < listSize);
  assert(listSize <= 2 ** 40);
  for (let i = 0; i < SHUFFLE_ROUND_COUNT; i++) {
    const pivot = bytesToBN(hash(Buffer.concat([seed, intToBytes(i, 1)])).slice(0, 8)).modn(listSize);
    const flip = (pivot - permuted) % listSize;
    const position = Math.max(permuted, flip);
    const source = hash(Buffer.concat([seed, intToBytes(i, 1), intToBytes(intDiv(position, 256), 4)]));
    const byte = source[intDiv(position % 256, 8)];
    const bit = (byte >> (position % 8)) % 2;
    permuted = bit ? flip : permuted;
  }
  return permuted;
}

/**
 * Returns a value such that for a list L, chunk count k and index i,
 * split(L, k)[i] == L[get_split_offset(len(L), k, i): get_split_offset(len(L), k, i+1)]
 * @param {number} listSize
 * @param {number} chunks
 * @param {number} index
 * @returns {number}
 */
export function getSplitOffset(listSize: number, chunks: number, index: number): number {
  return intDiv(listSize * index, chunks);
}

/**
 * Return the number of committees in one epoch.
 * @param {int} activeValidatorCount
 * @returns {Number}
 */
export function getEpochCommitteeCount(activeValidatorCount: int): int {
  return Math.max(
    1,
    Math.min(
      intDiv(SHARD_COUNT, SLOTS_PER_EPOCH),
      intDiv(intDiv(activeValidatorCount, SLOTS_PER_EPOCH), TARGET_COMMITTEE_SIZE),
    ),
  ) * SLOTS_PER_EPOCH;
}

/**
 * Return the ``index``'th shuffled committee out of a total ``total_committees``
 * using ``validator_indices`` and ``seed``.
 * @param {ValidatorIndex[]} validatorIndices
 * @param {bytes32} seed
 * @param {number} index
 * @param {number} totalCommittees
 * @returns {ValidatorIndex[]}
 */
export function computeCommittee(validatorIndices: ValidatorIndex[], seed: bytes32, index: number, totalCommittees: number): ValidatorIndex[] {
  const startOffset = getSplitOffset(validatorIndices.length, totalCommittees, index);
  const endOffset = getSplitOffset(validatorIndices.length, totalCommittees, index + 1);
  return Array.from({length: endOffset - startOffset},
    (_, i) => i + startOffset)
    .map((i) => validatorIndices[getPermutedIndex(i, validatorIndices.length, seed)]);
}

/**
 * Gets the current committee count per slot
 * @param {BeaconState} state
 * @returns {Number}
 */
export function getCurrentEpochCommitteeCount(state: BeaconState): int {
  const currentActiveValidators = getActiveValidatorIndices(state.validatorRegistry, getCurrentEpoch(state));
  return getEpochCommitteeCount(currentActiveValidators.length);
}

/**
 * Return the list of (committee, shard) acting as a tuple for the slot.
 * @param {BeaconState} state
 * @param {Slot} slot
 * @param {boolean} registryChange
 * @returns {[]}
 */
export function getCrosslinkCommitteesAtSlot(state: BeaconState, slot: Slot): [ValidatorIndex[], Shard][] {
  const epoch = slotToEpoch(slot);
  const currentEpoch = getCurrentEpoch(state);
  const previousEpoch = getPreviousEpoch(state);
  const nextEpoch = currentEpoch + 1;

  assert(previousEpoch <= epoch && epoch <= nextEpoch);
  const indices = getActiveValidatorIndices(state.validatorRegistry, epoch);
  const committeesPerEpoch = getEpochCommitteeCount(indices.length);

  let startShard;
  if (epoch === currentEpoch) {
    startShard = state.latestStartShard;
  } else if (epoch === previousEpoch) {
    startShard = (state.latestStartShard - committeesPerEpoch) % SHARD_COUNT;
  } else if (epoch === nextEpoch) {
    const currentEpochCommittees = getCurrentEpochCommitteeCount(state);
    startShard = (state.latestStartShard + currentEpochCommittees) % SHARD_COUNT;
  }

  const committeesPerSlot = intDiv(committeesPerEpoch, SLOTS_PER_EPOCH);
  const offset = slot % SLOTS_PER_EPOCH;
  const slotStartShard = (startShard + committeesPerSlot * offset) % SHARD_COUNT;
  const seed = generateSeed(state, epoch);

  return Array.apply(null, Array(committeesPerSlot))
    .map((x, i) => ([
      computeCommittee(indices, seed, committeesPerSlot * offset + i, committeesPerEpoch),
      (slotStartShard + i) % SHARD_COUNT,
    ]));
}

/**
 * Return the block root at a recent ``slot``.
 * @param {BeaconState} state
 * @param {Slot} slot
 * @returns {bytes32}
 */
export function getBlockRoot(state: BeaconState, slot: Slot): bytes32 {
  assert(slot < state.slot);
  assert(state.slot <= slot + SLOTS_PER_HISTORICAL_ROOT);
  return state.latestBlockRoots[slot % SLOTS_PER_HISTORICAL_ROOT];
}

/**
 * Return the state root at a recent ``slot``.
 * @param {BeaconState} state
 * @param {Slot} slot
 * @returns {bytes32}
 */
export function getStateRoot(state: BeaconState, slot: Slot): bytes32 {
  assert(slot < state.slot);
  assert(state.slot <= slot + SLOTS_PER_HISTORICAL_ROOT);
  return state.latestStateRoots[slot % SLOTS_PER_HISTORICAL_ROOT];
}

/**
 * Return the randao mix at a recent epoch.
 * @param {BeaconState} state
 * @param {Epoch} epoch
 * @returns {bytes32}
 */
export function getRandaoMix(state: BeaconState, epoch: Epoch): bytes32 {
  assert((getCurrentEpoch(state) - LATEST_RANDAO_MIXES_LENGTH) < epoch && epoch < getCurrentEpoch(state))
  return state.latestRandaoMixes[epoch % LATEST_RANDAO_MIXES_LENGTH];
}

/**
 * Return the index root at a recent epoch.
 * @param {BeaconState} state
 * @param {Epoch} epoch
 * @returns {bytes32}
 */
export function getActiveIndexRoot(state: BeaconState, epoch: Epoch): bytes32 {
  assert(getCurrentEpoch(state) - LATEST_ACTIVE_INDEX_ROOTS_LENGTH + ACTIVATION_EXIT_DELAY < epoch
    && epoch <= getCurrentEpoch(state) + ACTIVATION_EXIT_DELAY);
  return state.latestActiveIndexRoots[epoch % LATEST_ACTIVE_INDEX_ROOTS_LENGTH];
}

/**
 * Generate a seed for the given epoch.
 * @param {BeaconState} state
 * @param {Epoch} epoch
 * @returns {bytes32}
 */
export function generateSeed(state: BeaconState, epoch: Epoch): bytes32 {
  return hash(Buffer.concat([
    getRandaoMix(state, epoch - MIN_SEED_LOOKAHEAD),
    getActiveIndexRoot(state, epoch),
    intToBytes(epoch, 32),
  ]))
}

/**
 * Return the beacon proposer index for the ``slot``.
 * Due to proposer selection being based upon the validator balances during
 * the epoch in question, this can only be run for the current epoch.
 * @param {BeaconState} state
 * @param {Slot} slot
 * @returns {ValidatorIndex}
 */
export function getBeaconProposerIndex(state: BeaconState, slot: Slot): int {
  const currentEpoch = getCurrentEpoch(state);
  assert(slotToEpoch(slot) === currentEpoch);

  const [firstCommittee, _] = getCrosslinkCommitteesAtSlot(state, slot)[0];
  let i = 0;
  while (true) {
    const randByte = hash(Buffer.concat([
      generateSeed(state, currentEpoch),
      intToBytes(intDiv(i, 32), 8),
    ]))[i % 32];
    const candidate = firstCommittee[(currentEpoch + i) % firstCommittee.length];
    if (getEffectiveBalance(state, candidate).muln(256).gtn(MAX_DEPOSIT_AMOUNT * randByte)) {
      return candidate;
    }
    i += 1;
  }
}

/**
 * Verify that the given ``leaf`` is on the merkle branch ``proof``
 * starting with the given ``root``.
 * @param {bytes32} leaf
 * @param {bytes32[]} proof
 * @param {int} depth
 * @param {int} index
 * @param {bytes32} root
 * @returns {bool}
 */
export function verifyMerkleBranch(leaf: bytes32, proof: bytes32[], depth: number, index: number, root: bytes32): boolean {
  let value = leaf;
  for (let i = 0; i < depth; i++) {
    if (intDiv(index, 2**i) % 2) {
      value = hash(Buffer.concat([proof[i], value]));
    } else {
      value = hash(Buffer.concat([value, proof[i]]));
    }
  }
  return value.equals(root);
}

/**
 * Merkleize values where the length of values is a power of two and return the Merkle root.
 * @param {bytes32[]} values
 * @returns {bytes32}
 */
export function merkleRoot(values: bytes32[]): bytes32 {
  // Create array twice as long as values
  // first half of the array representing intermediate tree nodes
  const o: bytes[] = Array.from({ length: values.length },
    () => Buffer.alloc(0))
  // do not hash leaf nodes
  // we assume leaf nodes are prehashed
    .concat(values);
  for (let i = values.length - 1; i > 0; i--) {
    // hash intermediate/root nodes
    o[i] = hash(Buffer.concat([o[i * 2], o[i * 2 + 1]]));
  }
  return o[1];
}

/**
 * Return the crosslink committee corresponding to ``attestation_data``.
 * @param {BeaconState} state
 * @param {AttestationData} attestationData
 * @returns {ValidatorIndex[]}
 */
export function getCrosslinkCommitteeForAttestation(state: BeaconState, attestationData: AttestationData): ValidatorIndex[] {
  const crosslinkCommittees = getCrosslinkCommitteesAtSlot(state, attestationData.slot);

  // Find the committee in the list with the desired shard
  const crosslinkCommittee = crosslinkCommittees.find(([_, shard]) => shard === attestationData.shard);
  assert(crosslinkCommittee);
  return crosslinkCommittee[0];
}

/**
 * Return the sorted participant indices corresponding to ``attestation_data`` and ``bitfield``.
 * @param {BeaconState} state
 * @param {AttestationData} attestationData
 * @param {bytes} bitfield
 * @returns {ValidatorIndex[]}
 */
export function getAttestationParticipants(state: BeaconState, attestationData: AttestationData, bitfield: bytes): ValidatorIndex[] {
  const crosslinkCommittee = getCrosslinkCommitteeForAttestation(state, attestationData);

  assert(verifyBitfield(bitfield, crosslinkCommittee.length));

  // Find the participating attesters in the committee
  return crosslinkCommittee
    .filter((_, i) =>  getBitfieldBit(bitfield, i) === 0b1)
    .sort();
}

/**
 * Return the effective balance (also known as "balance at stake") for a validator with the given ``index``.
 * @param {BeaconState} state
 * @param {int} index
 * @returns {Number}
 */
export function getEffectiveBalance(state: BeaconState, index: ValidatorIndex): Gwei {
  return bnMin(getBalance(state, index), new BN(MAX_DEPOSIT_AMOUNT));
}

/**
 * Return the combined effective balance of an array of validators.
 * @param {BeaconState} state
 * @param {ValidatorIndex[]} validators
 * @returns {Gwei}
 */
export function getTotalBalance(state: BeaconState, validators: ValidatorIndex[]): Gwei {
  return validators.reduce((acc: BN, cur: ValidatorIndex): BN => acc.add(getEffectiveBalance(state, cur)), new BN(0));
}

/**
 * Return the fork version of the given epoch.
 * @param {Fork} fork
 * @param {Epoch} epoch
 * @returns {bytes4}
 */
export function getForkVersion(fork: Fork, epoch: Epoch): bytes4 {
  return epoch < fork.epoch ? fork.previousVersion : fork.currentVersion;
}

/**
 * Get the domain number that represents the fork meta and signature domain.
 * @param {Fork} fork
 * @param {Epoch} epoch
 * @param {int} domainType
 * @returns {Number}
 */
export function getDomain(fork: Fork, epoch: Epoch, domainType: int): uint64 {
  return bytesToBN(Buffer.concat([
    getForkVersion(fork, epoch),
    intToBytes(domainType, 4),
  ]));
}

/**
 * Returns the ith bit in bitfield
 * @param {bytes} bitfield
 * @param {int} i
 * @returns {int}
 */
export function getBitfieldBit(bitfield: bytes, i: int): int {
  const bit = i % 8;
  const byte = Math.floor(i / 8);
  return (bitfield[byte] >> bit) & 1;
}

/**
 * Verify ``bitfield`` against the ``committee_size``.
 * @param {bytes} bitfield
 * @param {int} committeeSize
 * @returns {bool}
 */
export function verifyBitfield(bitfield: bytes, committeeSize: int): bool {
  if (bitfield.length !== intDiv(committeeSize + 7, 8)) {
    return false;
  }

  // Check `bitfield` is padded with zero bits only
  for (let i = committeeSize; i < bitfield.length * 8; i++) {
    if (getBitfieldBit(bitfield, i) === 0b1) {
      return false;
    }
  }
  return true;
}

/**
 * Convert ``attestation`` to (almost) indexed-verifiable form.
 * @param {BeaconState} state
 * @param {Attestation} attestation
 * @returns {IndexedAttestation}
 */
export function convertToIndexed(state: BeaconState, attestation: Attestation): IndexedAttestation {
  const attestingIndices = getAttestationParticipants(state, attestation.data, attestation.aggregationBitfield);
  const custodyBit1Indices = getAttestationParticipants(state, attestation.data, attestation.custodyBitfield);
  const custodyBit0Indices = attestingIndices.filter((i) => custodyBit1Indices.includes(i));

  return {
    custodyBit0Indices,
    custodyBit1Indices,
    data: attestation.data,
    aggregateSignature: attestation.aggregateSignature,
  }
}

/**
 * Verify validity of ``indexed_attestation`` fields.
 * @param {BeaconState} state
 * @param {IndexedAttestation} indexedAttestation
 * @returns {bool}
 */
export function verifyIndexedAttestation(state: BeaconState, indexedAttestation: IndexedAttestation): bool {
  const custodyBit0Indices = indexedAttestation.custodyBit0Indices;
  const custodyBit1Indices = indexedAttestation.custodyBit1Indices;

  // ensure no duplicate indices across custody bits
  const custodyBit0IndicesSet = new Set(custodyBit0Indices);
  const duplicates = new Set(
    custodyBit1Indices.filter((i) => custodyBit0IndicesSet.has(i))
  );
  assert(duplicates.size === 0)

  // TO BE REMOVED IN PHASE 1
  if (custodyBit0Indices.length > 0) {
    return false;
  }

  const totalAttestingIndices = custodyBit0Indices.length + custodyBit1Indices.length;
  if (!(1 <= totalAttestingIndices && totalAttestingIndices <= MAX_ATTESTATION_PARTICIPANTS)) {
    return false;
  }


  const sortedCustodyBit0Indices = custodyBit0Indices.slice().sort();
  if (!custodyBit0Indices.every((index, i) => index === sortedCustodyBit0Indices[i])) {
    return false;
  }

  const sortedCustodyBit1Indices = custodyBit1Indices.slice().sort();
  if (!custodyBit1Indices.every((index, i) => index === sortedCustodyBit1Indices[i])) {
    return false;
  }

  return blsVerifyMultiple(
    [
      blsAggregatePubkeys(sortedCustodyBit0Indices.map((i) => state.validatorRegistry[i].pubkey)),
      blsAggregatePubkeys(sortedCustodyBit1Indices.map((i) => state.validatorRegistry[i].pubkey)),
    ], [
      hashTreeRoot({
        data: indexedAttestation.data,
        custodyBit: 0b0,
      }, AttestationDataAndCustodyBit),
      hashTreeRoot({
        data: indexedAttestation.data,
        custodyBit: 0b1,
      }, AttestationDataAndCustodyBit),
    ],
    indexedAttestation.aggregateSignature,
    getDomain(state.fork, slotToEpoch(indexedAttestation.data.slot), Domain.ATTESTATION),
  );
}

/**
 * Check if attestationData1 and attestationData2 have the same target.
 * @param {AttestationData} attestationData1
 * @param {AttestationData} attestationData2
 * @returns {boolean}
 */
export function isDoubleVote(attestationData1: AttestationData, attestationData2: AttestationData): boolean {
  const targetEpoch1: Epoch = slotToEpoch(attestationData1.slot);
  const targetEpoch2: Epoch = slotToEpoch(attestationData2.slot);
  return targetEpoch1 === targetEpoch2;
}

/**
 * Check if attestationData1 surrounds attestationData2
 * @param {AttestationData} attestationData1
 * @param {AttestationData} attestationData2
 * @returns {boolean}
 */
export function isSurroundVote(attestationData1: AttestationData, attestationData2: AttestationData): boolean {
  const sourceEpoch1: Epoch  = attestationData1.sourceEpoch;
  const sourceEpoch2: Epoch  = attestationData2.sourceEpoch;
  const targetEpoch1: Epoch  = slotToEpoch(attestationData1.slot);
  const targetEpoch2: Epoch  = slotToEpoch(attestationData2.slot);
  return (
    sourceEpoch1 < sourceEpoch2 &&
    targetEpoch2 < targetEpoch1
  );
}

/**
 * Calculate the largest integer k such that k**2 <= n.
 * Used in reward/penalty calculations
 * @param {int} n
 * @returns {int}
 */
export function intSqrt(n: int): int {
  let x: int = n;
  let y: int = Math.floor((x + 1) / 2);
  while (y < x) {
    x = y;
    y = Math.floor((x + Math.floor(n / x)) / 2);
  }
  return x;
}

export function bnSqrt(n: BN): BN {
  let x = n.clone();
  let y = x.addn(1).divn(2);
  while (y.lt(x)) {
    x = y;
    y = x.add(n.div(x)).divn(2);
  }
  return x;
}

/**
 * Return the epoch at which an activation or exit triggered in ``epoch`` takes effect.
 * @param {Epoch} epoch
 * @returns {Epoch}
 */
export function getDelayedActivationExitEpoch(epoch: Epoch): Epoch {
  return epoch + 1 + ACTIVATION_EXIT_DELAY;
}

/**
 * Process a deposit from eth1.x to eth2.
 * @param {BeaconState} state
 * @param {Deposit} deposit
 */
export function processDeposit(state: BeaconState, deposit: Deposit): void {
  // Deposits must be processed in order
  assert(deposit.index === state.depositIndex);

  // Verify the Merkle branch
  assert(verifyMerkleBranch(
    hash(serialize(deposit.data, DepositData)), // 48 + 32 + 8 + 96 = 184 bytes serialization
    deposit.proof, DEPOSIT_CONTRACT_TREE_DEPTH,
    deposit.index,
    state.latestEth1Data.depositRoot,
  ));


  // Increment the next deposit index we are expecting. Note that this
  // needs to be done here because while the deposit contract will never
  // create an invalid Merkle branch, it may admit an invalid deposit
  // object, and we need to be able to skip over it
  state.depositIndex += 1;

  const validatorPubkeys = state.validatorRegistry.map((v) => v.pubkey);
  const pubkey = deposit.data.pubkey;
  const amount = deposit.data.amount;

  if (!validatorPubkeys.includes(pubkey)) {
    // Verify the proof of possession
    assert(blsVerify(
      pubkey,
      signingRoot(deposit.data, DepositData),
      deposit.data.proofOfPossession,
      getDomain(state.fork, getCurrentEpoch(state), Domain.DEPOSIT),
    ));

    // Add new validator
    const validator: Validator = {
      pubkey,
      withdrawalCredentials: deposit.data.withdrawalCredentials,
      activationEpoch: FAR_FUTURE_EPOCH, 
      exitEpoch: FAR_FUTURE_EPOCH,
      withdrawableEpoch: FAR_FUTURE_EPOCH,
      initiatedExit: false,
      slashed: false,
      highBalance: new BN(0),
    };

    // Note: In phase 2 registry indices that have been withdrawn for a long time will be recycled.
    state.validatorRegistry.push(validator);
    state.balances.push(new BN(0));
    setBalance(state, state.validatorRegistry.length - 1, amount)
  } else {
    // Increase balance by deposit amount
    const index = validatorPubkeys.indexOf(pubkey);
    increaseBalance(state, index, amount);
  }
}
