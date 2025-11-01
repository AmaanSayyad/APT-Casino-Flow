/**
 * Game Payment Service
 * Unified service for handling both FLOW and FROTH payments in games
 */

import { flowTreasuryService } from './FlowTreasuryService';
import { frothService } from './FrothService';
import { FLOW_CASINO_CONFIG, FROTH_CONFIG } from '../config/flow';

class GamePaymentService {
  constructor() {
    this.supportedTokens = ['FLOW', 'FROTH'];
  }

  /**
   * Get balance for a specific token
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<string>} - Token balance
   */
  async getBalance(token, userAddress) {
    try {
      switch (token) {
        case 'FLOW':
          return await flowTreasuryService.getBalance(userAddress);
        case 'FROTH':
          return await frothService.getBalance(userAddress);
        default:
          throw new Error(`Unsupported token: ${token}`);
      }
    } catch (error) {
      console.error(`Error getting ${token} balance:`, error);
      return "0";
    }
  }

  /**
   * Check if user has sufficient balance for a bet
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Bet amount
   * @returns {Promise<boolean>} - Whether user has sufficient balance
   */
  async hasSufficientBalance(token, userAddress, amount) {
    try {
      switch (token) {
        case 'FLOW':
          return await flowTreasuryService.hasSufficientBalance(userAddress, amount);
        case 'FROTH':
          return await frothService.hasSufficientBalance(userAddress, amount);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking ${token} balance:`, error);
      return false;
    }
  }

  /**
   * Process a game bet
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @param {string} userAddress - User's wallet address
   * @param {string} betAmount - Bet amount
   * @param {string} gameType - Type of game
   * @param {object} gameParams - Game parameters
   * @returns {Promise<object>} - Bet result
   */
  async processBet(token, userAddress, betAmount, gameType, gameParams) {
    try {
      console.log(`🎮 Processing ${token} bet:`, { userAddress, betAmount, gameType });

      // Validate bet amount
      const validation = this.validateBetAmount(token, betAmount);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      switch (token) {
        case 'FLOW':
          return await flowTreasuryService.processBet(userAddress, betAmount, gameType, gameParams);
        case 'FROTH':
          return await frothService.processBet(userAddress, betAmount, gameType, gameParams);
        default:
          throw new Error(`Unsupported token: ${token}`);
      }
    } catch (error) {
      console.error(`❌ ${token} bet failed:`, error);
      throw error;
    }
  }

  /**
   * Process a game payout
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @param {string} userAddress - User's wallet address
   * @param {string} payoutAmount - Payout amount
   * @param {string} transactionId - Original bet transaction ID
   * @returns {Promise<object>} - Payout result
   */
  async processPayout(token, userAddress, payoutAmount, transactionId) {
    try {
      console.log(`💰 Processing ${token} payout:`, { userAddress, payoutAmount, transactionId });

      switch (token) {
        case 'FLOW':
          return await flowTreasuryService.processPayout(userAddress, payoutAmount, transactionId);
        case 'FROTH':
          return await frothService.processPayout(userAddress, payoutAmount, transactionId);
        default:
          throw new Error(`Unsupported token: ${token}`);
      }
    } catch (error) {
      console.error(`❌ ${token} payout failed:`, error);
      throw error;
    }
  }

  /**
   * Deposit tokens to casino balance
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Amount to deposit
   * @param {string} transactionId - Transaction ID for tracking
   * @returns {Promise<object>} - Deposit result
   */
  async deposit(token, userAddress, amount, transactionId) {
    try {
      console.log(`🏦 Processing ${token} deposit:`, { userAddress, amount, transactionId });

      switch (token) {
        case 'FLOW':
          return await flowTreasuryService.deposit(userAddress, amount, transactionId);
        case 'FROTH':
          return await frothService.deposit(userAddress, amount, transactionId);
        default:
          throw new Error(`Unsupported token: ${token}`);
      }
    } catch (error) {
      console.error(`❌ ${token} deposit failed:`, error);
      throw error;
    }
  }

  /**
   * Withdraw tokens from casino balance
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Amount to withdraw
   * @returns {Promise<object>} - Withdrawal result
   */
  async withdraw(token, userAddress, amount) {
    try {
      console.log(`🏦 Processing ${token} withdrawal:`, { userAddress, amount });

      switch (token) {
        case 'FLOW':
          return await flowTreasuryService.withdraw(userAddress, amount);
        case 'FROTH':
          return await frothService.withdraw(userAddress, amount);
        default:
          throw new Error(`Unsupported token: ${token}`);
      }
    } catch (error) {
      console.error(`❌ ${token} withdrawal failed:`, error);
      throw error;
    }
  }

  /**
   * Validate bet amount for a specific token
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @param {string} amount - Bet amount to validate
   * @returns {object} - Validation result
   */
  validateBetAmount(token, amount) {
    const betAmount = parseFloat(amount);

    if (isNaN(betAmount) || betAmount <= 0) {
      return {
        valid: false,
        error: 'Invalid bet amount'
      };
    }

    switch (token) {
      case 'FLOW':
        const flowMinBet = FLOW_CASINO_CONFIG.MIN_BET;
        const flowMaxBet = FLOW_CASINO_CONFIG.MAX_BET;
        
        if (betAmount < flowMinBet) {
          return {
            valid: false,
            error: `Minimum bet is ${flowMinBet} FLOW`
          };
        }
        
        if (betAmount > flowMaxBet) {
          return {
            valid: false,
            error: `Maximum bet is ${flowMaxBet} FLOW`
          };
        }
        break;

      case 'FROTH':
        const frothMinBet = FROTH_CONFIG.MIN_BET;
        const frothMaxBet = FROTH_CONFIG.MAX_BET;
        
        if (betAmount < frothMinBet) {
          return {
            valid: false,
            error: `Minimum bet is ${frothMinBet} FROTH`
          };
        }
        
        if (betAmount > frothMaxBet) {
          return {
            valid: false,
            error: `Maximum bet is ${frothMaxBet} FROTH`
          };
        }
        break;

      default:
        return {
          valid: false,
          error: `Unsupported token: ${token}`
        };
    }

    return {
      valid: true,
      error: null
    };
  }

  /**
   * Get minimum bet amount for a token
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @returns {number} - Minimum bet amount
   */
  getMinBet(token) {
    switch (token) {
      case 'FLOW':
        return FLOW_CASINO_CONFIG.MIN_BET;
      case 'FROTH':
        return FROTH_CONFIG.MIN_BET;
      default:
        return 0;
    }
  }

  /**
   * Get maximum bet amount for a token
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @returns {number} - Maximum bet amount
   */
  getMaxBet(token) {
    switch (token) {
      case 'FLOW':
        return FLOW_CASINO_CONFIG.MAX_BET;
      case 'FROTH':
        return FROTH_CONFIG.MAX_BET;
      default:
        return 0;
    }
  }

  /**
   * Format amount for display
   * @param {string} amount - Amount to format
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @returns {string} - Formatted amount
   */
  formatAmount(amount, token) {
    const num = parseFloat(amount || '0');
    
    switch (token) {
      case 'FLOW':
        return num.toFixed(4);
      case 'FROTH':
        if (num >= 1000000) {
          return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
          return (num / 1000).toFixed(2) + 'K';
        }
        return num.toFixed(2);
      default:
        return amount;
    }
  }

  /**
   * Get token configuration
   * @param {string} token - Token symbol (FLOW or FROTH)
   * @returns {object} - Token configuration
   */
  getTokenConfig(token) {
    switch (token) {
      case 'FLOW':
        return {
          symbol: 'FLOW',
          name: 'Flow Token',
          decimals: 8,
          minBet: FLOW_CASINO_CONFIG.MIN_BET,
          maxBet: FLOW_CASINO_CONFIG.MAX_BET,
          color: '#00EF8B'
        };
      case 'FROTH':
        return {
          symbol: 'FROTH',
          name: 'FROTH Token',
          decimals: 18,
          minBet: FROTH_CONFIG.MIN_BET,
          maxBet: FROTH_CONFIG.MAX_BET,
          color: '#FF6B35'
        };
      default:
        return null;
    }
  }



  /**
   * Get supported tokens
   * @returns {Array<string>} - Array of supported token symbols
   */
  getSupportedTokens() {
    return [...this.supportedTokens];
  }

  /**
   * Check if token is supported
   * @param {string} token - Token symbol to check
   * @returns {boolean} - Whether token is supported
   */
  isTokenSupported(token) {
    return this.supportedTokens.includes(token);
  }
}

// Export singleton instance
export const gamePaymentService = new GamePaymentService();
export default GamePaymentService;