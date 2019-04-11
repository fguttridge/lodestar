import {
  BeaconBlock,
  BeaconState,
  Eth1DataVote,
} from "../../../types";

export default function processEth1Data(state: BeaconState, block: BeaconBlock): void {
  for (const vote of state.eth1DataVotes) {
    if (vote.eth1Data.blockHash.equals(block.body.eth1Data.blockHash) &&
      vote.eth1Data.depositRoot.equals(block.body.eth1Data.depositRoot)) {
      // If someone else has already voted for the same hash, add to its counter
      vote.voteCount++;
      return;
    }
  }
  // If we're seeing this hash for the first time, make a new counter
  const vote: Eth1DataVote = {
    eth1Data: block.body.eth1Data,
    voteCount: 1,
  };
  state.eth1DataVotes.push(vote);
}
