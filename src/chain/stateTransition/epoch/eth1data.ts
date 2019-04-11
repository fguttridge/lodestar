import {BeaconState, Eth1DataVote} from "../../../types";
import {EPOCHS_PER_ETH1_VOTING_PERIOD, SLOTS_PER_EPOCH} from "../../../constants";
import { getCurrentEpoch } from "../../helpers/stateTransitionHelpers";

export function maybeResetEth1Period(state: BeaconState): void {
  const nextEpoch = getCurrentEpoch(state) + 1;

  if (nextEpoch % EPOCHS_PER_ETH1_VOTING_PERIOD === 0) {
    state.eth1DataVotes.forEach((vote: Eth1DataVote) => {

      // If a majority of all votes were for a particular eth1_data value,
      // then set that as the new canonical value
      if (vote.voteCount * 2 > EPOCHS_PER_ETH1_VOTING_PERIOD * SLOTS_PER_EPOCH) {
        state.latestEth1Data = vote.eth1Data;
      }
    });

    // reset the votes for next round
    state.eth1DataVotes = [];
  }
}

