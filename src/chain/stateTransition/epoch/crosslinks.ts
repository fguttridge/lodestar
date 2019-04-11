import {BeaconState, Crosslink} from "../../../types";
import { MAX_CROSSLINK_EPOCHS, GENESIS_EPOCH } from "../../../constants";
import {
  getCrosslinkCommitteesAtSlot, getEpochStartSlot, getTotalBalance,
  slotToEpoch,
  getCurrentEpoch
} from "../../helpers/stateTransitionHelpers";
import {getWinningRootAndParticipants} from "./helpers";

export function processCrosslinks(state: BeaconState): void {
  const currentEpoch = getCurrentEpoch(state);
  const previousEpoch = Math.max(currentEpoch - 1, GENESIS_EPOCH);
  const nextEpoch = currentEpoch + 1;

  const start = getEpochStartSlot(previousEpoch);
  const end = getEpochStartSlot(nextEpoch);
  for (let slot = start; slot < end; slot++) {
    getCrosslinkCommitteesAtSlot(state, slot).forEach(([crosslinkCommittee, shard]) => {
      const [winningRoot, participants] = getWinningRootAndParticipants(state, shard);
      const participatingBalance = getTotalBalance(state, participants);
      const totalBalance = getTotalBalance(state, crosslinkCommittee);
      if (participatingBalance.muln(3).gte(totalBalance.muln(2))) {
        const c: Crosslink = {
          epoch: Math.min(slotToEpoch(slot), state.latestCrosslinks[shard].epoch + MAX_CROSSLINK_EPOCHS),
          crosslinkDataRoot: winningRoot,
        };
        state.latestCrosslinks[shard] = c;
      }
    });
  }
}
