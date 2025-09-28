/**
 * Flow VRF (Verifiable Random Function) Service
 * Handles random number generation on Flow blockchain for casino games
 */

import * as fcl from "@onflow/fcl";

export class FlowVRFService {
  constructor() {
    this.treasuryAddress = process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS;
  }

  /**
   * Request randomness from Flow VRF (alias for generateRandomNumber)
   * @param {string} gameType - Type of game (roulette, mines, plinko, wheel)
   * @param {Object} gameParams - Game-specific parameters
   * @returns {Promise<Object>} VRF result with transaction ID
   */
  async requestRandomness(gameType, gameParams = {}) {
    // Use mock user address for now (in real app, get from wallet)
    const userAddress = '0x01cf0e2f2f715450';
    const betAmount = gameParams.betAmount || 1.0;
    
    return this.generateRandomNumber(gameType, userAddress, betAmount, gameParams);
  }

  /**
   * Generate random number using Flow VRF
   * @param {string} gameType - Type of game (roulette, mines, plinko, wheel)
   * @param {string} userAddress - User's Flow address
   * @param {number} betAmount - Bet amount in FLOW
   * @param {Object} gameParams - Game-specific parameters
   * @returns {Promise<Object>} VRF result with transaction ID
   */
  async generateRandomNumber(gameType, userAddress, betAmount, gameParams = {}) {
    try {
      console.log('🎲 Generating Flow VRF for game:', { gameType, userAddress, betAmount, gameParams });

      // Call Flow VRF API
      const response = await fetch('/api/flow-vrf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameType,
          userAddress,
          betAmount,
          gameParams,
          timestamp: Date.now()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Flow VRF generation failed');
      }

      console.log('✅ Flow VRF generated successfully:', result);

      return {
        randomNumber: result.randomNumber,
        transactionId: result.transactionId,
        blockHeight: result.blockHeight,
        gameType,
        userAddress,
        betAmount,
        timestamp: result.timestamp,
        explorerUrl: `https://testnet.flowscan.io/tx/${result.transactionId}`
      };

    } catch (error) {
      console.error('❌ Flow VRF generation error:', error);
      throw error;
    }
  }

  /**
   * Generate random number for Roulette (0-36)
   */
  async generateRouletteNumber(userAddress, betAmount, betType, betNumbers = []) {
    const gameParams = { betType, betNumbers: JSON.stringify(betNumbers) };
    const result = await this.generateRandomNumber('roulette', userAddress, betAmount, gameParams);
    
    return {
      ...result,
      rouletteNumber: parseInt(result.gameResult?.winningNumber || '0'),
      color: result.gameResult?.color || 'green',
      isWin: result.gameResult?.isWin === 'true',
      multiplier: parseFloat(result.gameResult?.multiplier || '0')
    };
  }

  /**
   * Generate random numbers for Mines
   */
  async generateMinesLayout(userAddress, betAmount, mineCount, revealedTiles = [], cashOut = false) {
    const gameParams = { mineCount, revealedTiles: JSON.stringify(revealedTiles), cashOut: cashOut.toString() };
    const result = await this.generateRandomNumber('mines', userAddress, betAmount, gameParams);
    
    return {
      ...result,
      minePositions: result.gameResult?.minePositions ? JSON.parse(result.gameResult.minePositions) : [],
      hitMine: result.gameResult?.hitMine === 'true',
      safeReveals: parseInt(result.gameResult?.safeReveals || '0'),
      mineCount,
      gridSize: 25
    };
  }

  /**
   * Generate random multiplier for Plinko
   */
  async generatePlinkoResult(userAddress, betAmount, risk, rows) {
    const gameParams = { risk, rows };
    const result = await this.generateRandomNumber('plinko', userAddress, betAmount, gameParams);
    
    return {
      ...result,
      finalPosition: result.gameResult?.finalPosition || 8,
      multiplier: result.gameResult?.multiplier || 1.0,
      path: result.gameResult?.path || []
    };
  }

  /**
   * Generate random result for Wheel
   */
  async generateWheelResult(userAddress, betAmount, segments = 54) {
    const gameParams = { segments: segments.toString() };
    const result = await this.generateRandomNumber('wheel', userAddress, betAmount, gameParams);
    
    return {
      ...result,
      winningSegment: parseInt(result.gameResult?.winningSegment || '0'),
      multiplier: parseFloat(result.gameResult?.multiplier || '1.0'),
      isWin: result.gameResult?.isWin === 'true'
    };
  }

  /**
   * Get roulette color for number
   */
  getRouletteColor(number) {
    if (number === 0) return 'green';
    
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(number) ? 'red' : 'black';
  }

  /**
   * Generate mine positions using random seed
   */
  generateMinePositions(seed, mineCount, gridSize) {
    const positions = [];
    let currentSeed = seed;
    
    while (positions.length < mineCount) {
      currentSeed = (currentSeed * 1103515245 + 12345) % (2 ** 31);
      const position = currentSeed % gridSize;
      
      if (!positions.includes(position)) {
        positions.push(position);
      }
    }
    
    return positions.sort((a, b) => a - b);
  }

  /**
   * Calculate Plinko ball path and final multiplier
   */
  calculatePlinkoPath(seed, rows, risk) {
    let currentSeed = seed;
    const path = [];
    let position = rows / 2; // Start at center
    
    for (let row = 0; row < rows; row++) {
      currentSeed = (currentSeed * 1103515245 + 12345) % (2 ** 31);
      const direction = (currentSeed % 2) === 0 ? -0.5 : 0.5;
      position += direction;
      path.push(Math.round(position));
    }
    
    const finalPosition = Math.max(0, Math.min(rows, Math.round(position)));
    const multiplier = this.getPlinkoMultiplier(finalPosition, rows, risk);
    
    return {
      path,
      finalPosition,
      multiplier
    };
  }

  /**
   * Get Plinko multiplier based on final position
   */
  getPlinkoMultiplier(position, rows, risk) {
    // Simplified multiplier calculation
    const center = rows / 2;
    const distance = Math.abs(position - center);
    
    const baseMultipliers = {
      low: [1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5],
      medium: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
      high: [29, 4, 1.5, 1.1, 1.0, 1.1, 1.5, 4, 29]
    };
    
    const multipliers = baseMultipliers[risk] || baseMultipliers.medium;
    const index = Math.min(position, multipliers.length - 1);
    
    return multipliers[index] || 1.0;
  }

  /**
   * Get wheel segment information
   */
  getWheelSegmentInfo(segmentIndex) {
    // Simplified wheel segments (54 segments)
    const segments = [
      { multiplier: 1.2, color: 'blue' },
      { multiplier: 1.5, color: 'green' },
      { multiplier: 2.0, color: 'yellow' },
      { multiplier: 5.0, color: 'red' },
      { multiplier: 10.0, color: 'purple' },
      // ... more segments
    ];
    
    const segmentType = segmentIndex % 5;
    const baseSegment = segments[segmentType] || segments[0];
    
    return {
      multiplier: baseSegment.multiplier,
      color: baseSegment.color,
      segment: segmentIndex
    };
  }

  /**
   * Verify VRF result on Flow blockchain
   */
  async verifyVRFResult(transactionId) {
    try {
      const transaction = await fcl.tx(transactionId).onceSealed();
      
      if (transaction.status === 4) { // SEALED
        return {
          verified: true,
          blockHeight: transaction.blockId,
          events: transaction.events
        };
      }
      
      return { verified: false, error: 'Transaction not sealed' };
    } catch (error) {
      console.error('VRF verification error:', error);
      return { verified: false, error: error.message };
    }
  }
}

// Export singleton instance
export const flowVRFService = new FlowVRFService();
export default flowVRFService;