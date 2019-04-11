import {hashTreeRoot} from "@chainsafe/ssz";
import {ValidatorIndex, BeaconBlock, BeaconState} from "../src/types";
import RPCProvider from "./stubs";
import logger from "../src/logger/winston";

export default class BlockProcessingService {
  private validatorIndex: ValidatorIndex;
  private provider: RPCProvider;

  public constructor(index: ValidatorIndex, provider: RPCProvider) {
    this.validatorIndex= index;
    this.provider = provider;
  }

  /**
   * Check if validator is a proposer
   * @returns {Promise<boolean>}
   */
  private async isProposer(): Promise<boolean> {
    let isValid = false;
    while (!isValid) {
      logger.info("Checking if validator is proposer...");
      isValid = await this.provider.isActiveValidator(this.validatorIndex);
    }
    logger.info("Validator is proposer!");
    return true;
  }

  /**
   * IFF a validator is selected construct a block to propose.
   * @returns {Promise<void>}
   */
  private async buildBlock() {
    let block: BeaconBlock;
    const slot = await this.provider.getCurrentSlot();
    const prevBlock = await this.provider.getCurrentBlock();
    const curState = await this.provider.getCurrentState();
    block.slot = slot;
    // Note: To calculate state_root, the validator should first run the state transition function on an unsigned block
    // containing a stub for the state_root. It is useful to be able to run a state transition function that does not
    // validate signatures or state root for this purpose.
    block.previousBlockRoot = hashTreeRoot(prevBlock, BeaconBlock);
    block.stateRoot = hashTreeRoot(curState, BeaconState);
    // TODO remove stub and use blsSign
  }

  /**
   * Main function to start block processing
   * @returns {Promise<void>}
   */
  public async start() {
    await this.isProposer();
    this.buildBlock();
  }
}

// export interface BeaconBlock {
//   // Header
//   slot: uint64;
//   parentRoot: bytes32;
//   stateRoot: bytes32;
//   randaoReveal: bytes96;
//   eth1Data: Eth1Data;
//   signature: bytes96;
//
//   // Body
//   body: BeaconBlockBody;
// }
