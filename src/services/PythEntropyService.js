/**
 * Flow VRF Service (Replaces Pyth Entropy)
 * Service for generating random numbers using Flow VRF
 */

import FlowVRFService from './FlowVRFService';

class FlowVRFServiceWrapper {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the Flow VRF service
   * @param {string} network - Network to use (default: testnet)
   */
  async initialize(network = null) {
    try {
      console.log('🎲 FLOW VRF: Initializing Flow VRF service...');
      
      // Initialize the underlying Flow VRF service
      await FlowVRFService.initialize();
      
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
      
      // Use the Flow VRF service to generate random numbers
      const result = await FlowVRFService.generateRandom(gameType, gameConfig);
      
      console.log('✅ FLOW VRF: Random value generated successfully');
      console.log('🔗 Commit TX:', result.commitTx);
      console.log('🔗 Reveal TX:', result.revealTx);
      console.log('🎲 Random value:', result.randomValue);
      
      return {
        randomValue: result.randomValue,
        entropyProof: {
          requestId: result.requestId,
          commitTx: result.commitTx,
          revealTx: result.revealTx,
          transactionHash: result.revealTx // Use reveal tx as main transaction
        },
        success: true,
        gameType: gameType,
        gameConfig: gameConfig,
        metadata: {
          source: 'Flow VRF',
          network: 'testnet',
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
   * Check if the service is available
   * @returns {boolean} Service availability
   */
  isAvailable() {
    return this.isInitialized && FlowVRFService.isAvailable();
  }

  /**
   * Get Flowscan URL for transaction
   * @param {string} txHash - Transaction hash
   * @returns {string} Flowscan URL
   */
  getFlowscanUrl(txHash) {
    return `https://testnet.flowscan.org/transaction/${txHash}`;
  }

  /**
   * Generate a unique seed for the entropy request
   * @param {string} gameType - Game type
   * @param {Object} gameConfig - Game configuration
   * @returns {string} Unique seed
   */
  generateSeed(gameType, gameConfig) {
    const configString = JSON.stringify(gameConfig);
    const timestamp = Date.now().toString();
    return `${gameType}_${configString}_${timestamp}`;
  }

  /**
   * Get network configuration
   * @returns {Object} Current network configuration
   */
  getNetworkConfig() {
    return {
      name: 'Flow Testnet',
      chainId: 'testnet',
      explorerUrl: 'https://testnet.flowscan.org'
    };
  }

  /**
   * Switch to a different network
   * @param {string} network - Network name
   */
  async switchNetwork(network) {
    console.log(`🔄 FLOW VRF: Switching to network ${network}...`);
    this.isInitialized = false;
    await this.initialize(network);
  }

  /**
   * Get supported networks
   * @returns {Array} Array of supported network names
   */
  getSupportedNetworks() {
    return ['testnet', 'mainnet'];
  }

  /**
   * Check if a network is supported
   * @param {string} network - Network name
   * @returns {boolean} True if supported
   */
  isNetworkSupported(network) {
    return ['testnet', 'mainnet'].includes(network);
  }
}

// Create singleton instance
const flowVRFService = new FlowVRFServiceWrapper();

export default flowVRFService;