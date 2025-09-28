/**
 * Flow VRF Service
 * Service for generating random numbers using Flow VRF
 */

import * as fcl from '@onflow/fcl';
import { FLOW_CONFIG } from '@/config/flowConfig';

class FlowVRFService {
  constructor() {
    this.isInitialized = false;
    this.networkConfig = null;
  }

  /**
   * Initialize the Flow VRF service
   */
  async initialize() {
    try {
      console.log('🎲 FLOW VRF: Initializing Flow VRF service...');
      
      // Get current network configuration
      this.networkConfig = FLOW_CONFIG.NETWORKS[FLOW_CONFIG.CURRENT_NETWORK];
      
      // Configure FCL
      fcl.config({
        'accessNode.api': this.networkConfig.accessNode,
        'discovery.wallet': this.networkConfig.discoveryWallet,
        '0xFlowVRF': FLOW_CONFIG.CONTRACTS.VRF_CONTRACT,
        '0xCasino': FLOW_CONFIG.CONTRACTS.CASINO_CONTRACT,
        '0xFlowToken': FLOW_CONFIG.CONTRACTS.FLOW_TOKEN,
      });

      this.isInitialized = true;
      console.log('✅ FLOW VRF: Service initialized successfully');
      
    } catch (error) {
      console.error('❌ FLOW VRF: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate a random number using Flow VRF
   * @param {string} gameType - Type of game (MINES, PLINKO, ROULETTE, WHEEL)
   * @param {Object} gameConfig - Game configuration
   * @returns {Promise<Object>} Random number result with proof
   */
  async generateRandom(gameType, gameConfig = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🎲 FLOW VRF: Generating random for ${gameType}...`);
      
      // Create a unique request ID
      const requestId = `game_${gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate random seed
      const randomSeed = this.generateRandomSeed();
      
      // Create commit transaction
      const commitTx = await this.createCommitTransaction(requestId, randomSeed);
      
      // Wait for commit confirmation
      const commitResult = await fcl.tx(commitTx).onceSealed();
      
      if (!commitResult.statusCode === 4) {
        throw new Error(`Commit transaction failed: ${commitResult.errorMessage}`);
      }
      
      console.log('✅ FLOW VRF: Commit transaction confirmed');
      
      // Wait for reveal delay
      await this.waitForRevealDelay();
      
      // Create reveal transaction
      const revealTx = await this.createRevealTransaction(requestId, randomSeed);
      
      // Wait for reveal confirmation
      const revealResult = await fcl.tx(revealTx).onceSealed();
      
      if (!revealResult.statusCode === 4) {
        throw new Error(`Reveal transaction failed: ${revealResult.errorMessage}`);
      }
      
      console.log('✅ FLOW VRF: Reveal transaction confirmed');
      
      // Get the random value
      const randomValue = await this.getRandomValue(requestId);
      
      console.log('✅ FLOW VRF: Random value generated successfully');
      console.log('🎲 Random value:', randomValue);
      
      return {
        randomValue: randomValue,
        requestId: requestId,
        commitTx: commitResult.transactionId,
        revealTx: revealResult.transactionId,
        success: true,
        gameType: gameType,
        gameConfig: gameConfig,
        metadata: {
          source: 'Flow VRF',
          network: FLOW_CONFIG.CURRENT_NETWORK,
          algorithm: 'commit-reveal',
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('❌ FLOW VRF: Error generating random:', error);
      throw error;
    }
  }

  /**
   * Generate a random seed for commit-reveal scheme
   * @returns {string} Random seed in hex format
   */
  generateRandomSeed() {
    const array = new Uint8Array(FLOW_CONFIG.VRF.RANDOM_SEED_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create commit transaction
   * @param {string} requestId - Unique request ID
   * @param {string} randomSeed - Random seed for commit
   * @returns {Object} FCL transaction
   */
  async createCommitTransaction(requestId, randomSeed) {
    return fcl.transaction({
      cadence: `
        import FlowVRF from 0xFlowVRF
        import Casino from 0xCasino

        transaction(requestId: String, randomSeed: String) {
          prepare(acct: AuthAccount) {
            FlowVRF.commitRandom(requestId: requestId, randomSeed: randomSeed)
          }
        }
      `,
      args: [
        fcl.arg(requestId, fcl.t.String),
        fcl.arg(randomSeed, fcl.t.String)
      ],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser]
    });
  }

  /**
   * Create reveal transaction
   * @param {string} requestId - Unique request ID
   * @param {string} randomSeed - Random seed for reveal
   * @returns {Object} FCL transaction
   */
  async createRevealTransaction(requestId, randomSeed) {
    return fcl.transaction({
      cadence: `
        import FlowVRF from 0xFlowVRF
        import Casino from 0xCasino

        transaction(requestId: String, randomSeed: String) {
          prepare(acct: AuthAccount) {
            FlowVRF.revealRandom(requestId: requestId, randomSeed: randomSeed)
          }
        }
      `,
      args: [
        fcl.arg(requestId, fcl.t.String),
        fcl.arg(randomSeed, fcl.t.String)
      ],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser]
    });
  }

  /**
   * Get random value from VRF contract
   * @param {string} requestId - Unique request ID
   * @returns {Promise<string>} Random value
   */
  async getRandomValue(requestId) {
    const result = await fcl.query({
      cadence: `
        import FlowVRF from 0xFlowVRF

        pub fun main(requestId: String): String? {
          return FlowVRF.getRandomValue(requestId: requestId)
        }
      `,
      args: [fcl.arg(requestId, fcl.t.String)]
    });
    
    return result;
  }

  /**
   * Wait for reveal delay
   * @returns {Promise<void>}
   */
  async waitForRevealDelay() {
    const delay = FLOW_CONFIG.VRF.COMMIT_REVEAL_DELAY * 1000; // Convert to milliseconds
    console.log(`⏳ FLOW VRF: Waiting ${delay}ms for reveal delay...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Check if VRF service is available
   * @returns {boolean} Service availability
   */
  isAvailable() {
    return this.isInitialized;
  }
}

// Export singleton instance
export default new FlowVRFService();
