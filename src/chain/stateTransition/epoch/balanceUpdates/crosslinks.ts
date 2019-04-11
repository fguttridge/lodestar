import BN from "bn.js";
import {BeaconState, Gwei} from "../../../../types";
import { getEpochStartSlot, getPreviousEpoch, getCurrentEpoch, getCrosslinkCommitteesAtSlot, getTotalBalance } from "../../../helpers/stateTransitionHelpers";
import { getWinningRootAndParticipants, getBaseReward } from "../helpers";

export function getCrosslinkDeltas(state: BeaconState): [Gwei[], Gwei[]] {
  const rewards = Array.from({length: state.validatorRegistry.length}, () => new BN(0));
  const penalties = Array.from({length: state.validatorRegistry.length}, () => new BN(0));
  const previousEpochStartSlot = getEpochStartSlot(getPreviousEpoch(state));
  const currentEpochStartSlot = getEpochStartSlot(getCurrentEpoch(state));
  for (let slot = previousEpochStartSlot; slot < currentEpochStartSlot; slot++) {
    getCrosslinkCommitteesAtSlot(state, slot).forEach(([crosslinkCommittee, shard]) => {
      const [_, participants] = getWinningRootAndParticipants(state, shard);
      const participatingBalance = getTotalBalance(state, participants);
      const totalBalance = getTotalBalance(state, crosslinkCommittee);
      crosslinkCommittee.forEach((index) => {
        if (participants.includes(index)) {
          rewards[index] = rewards[index].add(
            getBaseReward(state, index).mul(participatingBalance.div(totalBalance)));
        } else {
          penalties[index] = penalties[index].add(
            getBaseReward(state, index));
        }
      })
    });
  }
  return [rewards, penalties];
}
