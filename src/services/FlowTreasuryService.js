/**
 * Flow Treasury Service
 * Handles Flow token deposits and withdrawals similar to FLOW treasury system
 */

export class FlowTreasuryService {
  constructor() {
    this.treasuryAddress = process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS || "0x038360087beccc9a";
  }

  /**
   * Get Flow balance from localStorage (localBalance system)
   * @param {string} address - User's Flow address
   * @returns {string} Balance as string
   */
  async getBalance(address) {
    try {
      // Try to get Flow balance from localStorage first
      const savedBalance = localStorage.getItem(`userFlowBalance_${address}`);
      if (savedBalance && !isNaN(savedBalance) && parseFloat(savedBalance) >= 0) {
        return savedBalance;
      }
      
      // Try global Flow balance
      const globalBalance = localStorage.getItem('userFlowBalance');
      if (globalBalance && !isNaN(globalBalance) && parseFloat(globalBalance) >= 0) {
        return globalBalance;
      }
      
      // Return zero balance if nothing found
      return "0";
    } catch (error) {
      console.error('Error getting Flow balance:', error);
      return "0";
    }
  }

  /**
   * Process Flow deposit
   * @param {string} userAddress - User's Flow address
   * @param {number} amount - Amount to deposit
   * @param {string} transactionId - Flow transaction ID
   * @returns {Promise<Object>} Deposit result
   */
  async deposit(userAddress, amount, transactionId) {
    try {
      console.log('Processing Flow deposit:', { userAddress, amount, transactionId });
      
      // Call Flow deposit API
      const response = await fetch('/api/flow-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
          amount: amount,
          transactionId: transactionId || 'flow_tx_' + Math.random().toString(36).substr(2, 16)
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Flow deposit failed');
      }
      
      console.log('FlowTreasuryService deposit: API call successful');
      
      return result;
    } catch (error) {
      console.error('Flow deposit error:', error);
      throw error;
    }
  }

  /**
   * Process Flow withdrawal
   * @param {string} userAddress - User's Flow address
   * @param {number} amount - Amount to withdraw
   * @returns {Promise<Object>} Withdrawal result
   */
  async withdraw(userAddress, amount) {
    try {
      console.log('Processing Flow withdrawal:', { userAddress, amount });
      
      // Call Flow withdraw API
      const response = await fetch('/api/flow-withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
          amount: amount
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Flow withdrawal failed');
      }
      
      console.log('FlowTreasuryService withdrawal: API call successful');
      
      return result;
    } catch (error) {
      console.error('Flow withdrawal error:', error);
      throw error;
    }
  }

  /**
   * Get Flow deposit history
   * @param {string} userAddress - User's Flow address
   * @returns {Promise<Array>} Deposit history
   */
  async getDepositHistory(userAddress) {
    try {
      const response = await fetch(`/api/flow-deposit?userAddress=${encodeURIComponent(userAddress)}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get Flow deposit history');
      }
      
      return result.deposits || [];
    } catch (error) {
      console.error('Error getting Flow deposit history:', error);
      return [];
    }
  }

  /**
   * Validate Flow address format
   * @param {string} address - Address to validate
   * @returns {boolean} Is valid address
   */
  isValidFlowAddress(address) {
    // Flow addresses are 16 characters hex (8 bytes) with 0x prefix
    const flowAddressRegex = /^0x[a-fA-F0-9]{16}$/;
    return flowAddressRegex.test(address);
  }

  /**
   * Format Flow amount for display
   * @param {string|number} amount - Amount to format
   * @param {number} decimals - Decimal places (default 5)
   * @returns {string} Formatted amount
   */
  formatFlowAmount(amount, decimals = 5) {
    return parseFloat(amount).toFixed(decimals);
  }

  /**
   * Convert Flow amount to display format
   * @param {string|number} amount - Amount in Flow
   * @returns {string} Display amount
   */
  toDisplayAmount(amount) {
    return this.formatFlowAmount(amount, 5);
  }
}

// Export singleton instance
export const flowTreasuryService = new FlowTreasuryService();
export default flowTreasuryService;
