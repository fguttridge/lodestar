import BN  from "bn.js";
import {BeaconState} from "../../../../types";
import {getJustificationAndFinalizationDeltas} from "./justification";
import {getCrosslinkDeltas} from "./crosslinks";
import {setBalance, getBalance} from "../../../helpers/stateTransitionHelpers";
import { bnMax } from "../../../../helpers/math";

export function applyRewards(state: BeaconState): void {
  const [rewards1, penalties1] = getJustificationAndFinalizationDeltas(state);
  const [rewards2, penalties2] = getCrosslinkDeltas(state);
  state.validatorRegistry.forEach((_, index) =>
    setBalance(
      state,
      index,
      bnMax(
        new BN(0),
        getBalance(state, index)
          .add(rewards1[index])
          .add(rewards2[index])
          .sub(penalties1[index])
          .sub(penalties2[index])
      )
    )
  );
}
