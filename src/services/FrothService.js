/**
 * FROTH Token Service
 * Handles FROTH token operations for the casino on Flow EVM Mainnet
 */

import { FROTH_CONFIG } from '../config/flow';

class FrothService {
  constructor() {
    this.contractAddress = FROTH_CONFIG.CONTRACT_ADDRESS;
    this.decimals = FROTH_CONFIG.DECIMALS;
    this.symbol = FROTH_CONFIG.SYMBOL;
    this.network = FROTH_CONFIG.NETWORK;
  }

  /**
   * Get Web3 provider for Flow EVM (prioritize Flow Wallet)
   */
  async getWeb3Provider() {
    if (typeof window !== 'undefined') {
      let provider = null;

      console.log('🔍 Checking available providers...');
      console.log('window.ethereum:', !!window.ethereum);
      console.log('window.ethereum.isFlowWallet:', window.ethereum?.isFlowWallet);
      console.log('window.ethereum.isMetaMask:', window.ethereum?.isMetaMask);
      console.log('window.fcl:', !!window.fcl);

      // Priority 1: Flow Wallet EVM support
      if (window.ethereum && window.ethereum.isFlowWallet) {
        console.log('✅ Using Flow Wallet EVM provider');
        provider = window.ethereum;
      }
      // Priority 2: FCL EVM bridge
      else if (window.fcl && window.fcl.WalletUtils && window.fcl.WalletUtils.getEVMProvider) {
        console.log('✅ Using Flow Wallet EVM bridge');
        try {
          provider = await window.fcl.WalletUtils.getEVMProvider();
        } catch (error) {
          console.warn('⚠️ FCL EVM bridge failed:', error);
        }
      }
      // Priority 3: Check if MetaMask is present and warn user
      else if (window.ethereum && window.ethereum.isMetaMask) {
        console.warn('⚠️ MetaMask detected - Flow Wallet EVM not available');
        throw new Error('Flow Wallet EVM support not detected. Please ensure you are using Flow Wallet with EVM support, not MetaMask.');
      }
      // Priority 4: Generic EVM provider (last resort)
      else if (window.ethereum) {
        console.log('⚠️ Using generic EVM provider (unknown wallet)');
        provider = window.ethereum;
      }

      if (provider) {
        // Check if we're on the correct network
        const chainId = await provider.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== this.network.chainId) {
          // Switch to Flow EVM Mainnet
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${this.network.chainId.toString(16)}` }],
            });
          } catch (switchError) {
            // Network not added, add it
            if (switchError.code === 4902) {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${this.network.chainId.toString(16)}`,
                  chainName: this.network.name,
                  rpcUrls: [this.network.rpcUrl],
                  blockExplorerUrls: [this.network.blockExplorer],
                  nativeCurrency: {
                    name: 'FLOW',
                    symbol: 'FLOW',
                    decimals: 18
                  }
                }]
              });
            }
          }
        }
        return provider;
      }
    }
    throw new Error('Flow Wallet or compatible EVM wallet not found. Please connect your Flow Wallet first.');
  }

  /**
   * Get FROTH balance for a user from mainnet contract
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<string>} - FROTH balance
   */
  async getBalance(userAddress) {
    try {
      if (!userAddress) return "0";

      // Call FROTH contract on Flow EVM Mainnet
      const response = await fetch('/api/froth-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
          contractAddress: this.contractAddress
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.balance;
      } else {
        console.error('Error fetching FROTH balance:', result.error);
        return "0";
      }
    } catch (error) {
      console.error('Error getting FROTH balance:', error);
      return "0";
    }
  }

  /**
   * Deposit FROTH tokens using Flow Wallet EVM
   * @param {string} flowAddress - User's Flow address
   * @param {string} amount - Amount to deposit
   * @param {string} treasuryAddress - Treasury EVM address
   * @returns {Promise<object>} - Deposit result
   */
  async depositWithFlowWallet(flowAddress, amount, treasuryAddress) {
    try {
      console.log('🟡 Processing FROTH deposit with Flow Wallet:', { flowAddress, amount, treasuryAddress });

      // Get Flow Wallet EVM provider
      const provider = await this.getWeb3Provider();
      
      // Get user's EVM address from Flow Wallet
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const evmAddress = accounts[0];

      console.log('🔗 Flow Wallet EVM address:', evmAddress);

      // Create transaction to transfer FROTH to treasury
      const transferAmount = (parseFloat(amount) * Math.pow(10, this.decimals)).toString();
      
      // ERC20 transfer function signature
      const transferData = this.encodeTransferData(treasuryAddress, transferAmount);

      const txParams = {
        from: evmAddress,
        to: this.contractAddress,
        data: transferData,
        gas: '0x5208', // 21000 gas limit
      };

      // Send transaction via Flow Wallet
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      console.log('✅ FROTH transfer transaction sent:', txHash);

      // Wait for transaction confirmation
      await this.waitForTransaction(provider, txHash);

      // Call deposit API to update balance
      const response = await fetch('/api/froth-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: evmAddress,
          flowAddress: flowAddress,
          amount: amount,
          transactionId: txHash,
          contractAddress: this.contractAddress
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'FROTH deposit failed');
      }

      console.log('✅ FROTH deposit successful:', result);
      return result;
    } catch (error) {
      console.error('❌ FROTH deposit failed:', error);
      throw new Error(`FROTH deposit failed: ${error.message}`);
    }
  }

  /**
   * Deposit FROTH tokens to casino balance (mainnet) - Legacy method
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Amount to deposit
   * @param {string} transactionId - Transaction ID for tracking
   * @returns {Promise<object>} - Deposit result
   */
  async deposit(userAddress, amount, transactionId) {
    try {
      console.log('🟡 Processing FROTH deposit on mainnet:', { userAddress, amount, transactionId });

      // Call deposit API that handles mainnet FROTH contract
      const response = await fetch('/api/froth-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
          amount: amount,
          transactionId: transactionId,
          contractAddress: this.contractAddress
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'FROTH deposit failed');
      }

      console.log('✅ FROTH deposit successful:', result);
      return result;
    } catch (error) {
      console.error('❌ FROTH deposit failed:', error);
      throw new Error(`FROTH deposit failed: ${error.message}`);
    }
  }

  /**
   * Withdraw FROTH tokens from casino balance (mainnet)
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Amount to withdraw
   * @returns {Promise<object>} - Withdrawal result
   */
  async withdraw(userAddress, amount) {
    try {
      console.log('🟡 Processing FROTH withdrawal on mainnet:', { userAddress, amount });

      // Call withdrawal API that handles mainnet FROTH contract
      const response = await fetch('/api/froth-withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
          amount: amount,
          contractAddress: this.contractAddress
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'FROTH withdrawal failed');
      }

      console.log('✅ FROTH withdrawal successful:', result);
      return result;
    } catch (error) {
      console.error('❌ FROTH withdrawal failed:', error);
      throw new Error(`FROTH withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Check if user has sufficient FROTH balance for a bet
   * @param {string} userAddress - User's wallet address
   * @param {string} amount - Bet amount
   * @returns {Promise<boolean>} - Whether user has sufficient balance
   */
  async hasSufficientBalance(userAddress, amount) {
    try {
      const balance = await this.getBalance(userAddress);
      return parseFloat(balance) >= parseFloat(amount);
    } catch (error) {
      console.error('Error checking FROTH balance:', error);
      return false;
    }
  }

  /**
   * Process a game bet with FROTH
   * @param {string} userAddress - User's wallet address
   * @param {string} betAmount - Bet amount
   * @param {string} gameType - Type of game
   * @param {object} gameParams - Game parameters
   * @returns {Promise<object>} - Bet result
   */
  async processBet(userAddress, betAmount, gameType, gameParams) {
    try {
      console.log('🎮 Processing FROTH bet:', { userAddress, betAmount, gameType });

      // Check sufficient balance
      const hasSufficient = await this.hasSufficientBalance(userAddress, betAmount);
      if (!hasSufficient) {
        throw new Error('Insufficient FROTH balance for bet');
      }

      // Deduct bet amount
      const currentBalance = parseFloat(localStorage.getItem('userFrothBalance') || "0");
      const newBalance = (currentBalance - parseFloat(betAmount)).toFixed(2);
      localStorage.setItem('userFrothBalance', newBalance);

      const result = {
        success: true,
        transactionId: `froth_bet_${Date.now()}`,
        betAmount: betAmount,
        newBalance: newBalance,
        token: 'FROTH',
        gameType: gameType,
        gameParams: gameParams
      };

      console.log('✅ FROTH bet processed:', result);
      return result;
    } catch (error) {
      console.error('❌ FROTH bet failed:', error);
      throw new Error(`FROTH bet failed: ${error.message}`);
    }
  }

  /**
   * Process a game payout with FROTH
   * @param {string} userAddress - User's wallet address
   * @param {string} payoutAmount - Payout amount
   * @param {string} transactionId - Original bet transaction ID
   * @returns {Promise<object>} - Payout result
   */
  async processPayout(userAddress, payoutAmount, transactionId) {
    try {
      console.log('💰 Processing FROTH payout:', { userAddress, payoutAmount, transactionId });

      if (parseFloat(payoutAmount) <= 0) {
        console.log('No payout needed (amount <= 0)');
        return {
          success: true,
          payoutAmount: "0",
          newBalance: localStorage.getItem('userFrothBalance') || "0",
          token: 'FROTH'
        };
      }

      // Add payout amount
      const currentBalance = parseFloat(localStorage.getItem('userFrothBalance') || "0");
      const newBalance = (currentBalance + parseFloat(payoutAmount)).toFixed(2);
      localStorage.setItem('userFrothBalance', newBalance);

      const result = {
        success: true,
        transactionId: `froth_payout_${Date.now()}`,
        payoutAmount: payoutAmount,
        newBalance: newBalance,
        token: 'FROTH'
      };

      console.log('✅ FROTH payout processed:', result);
      return result;
    } catch (error) {
      console.error('❌ FROTH payout failed:', error);
      throw new Error(`FROTH payout failed: ${error.message}`);
    }
  }



  /**
   * Encode ERC20 transfer function data
   * @param {string} to - Recipient address
   * @param {string} amount - Amount to transfer (in wei)
   * @returns {string} - Encoded function data
   */
  encodeTransferData(to, amount) {
    // ERC20 transfer function signature: transfer(address,uint256)
    const functionSignature = '0xa9059cbb';
    
    // Pad address to 32 bytes
    const paddedAddress = to.replace('0x', '').padStart(64, '0');
    
    // Pad amount to 32 bytes
    const paddedAmount = BigInt(amount).toString(16).padStart(64, '0');
    
    return functionSignature + paddedAddress + paddedAmount;
  }

  /**
   * Wait for transaction confirmation
   * @param {object} provider - EVM provider
   * @param {string} txHash - Transaction hash
   * @returns {Promise<object>} - Transaction receipt
   */
  async waitForTransaction(provider, txHash) {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      try {
        const receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        
        if (receipt) {
          console.log('✅ Transaction confirmed:', receipt);
          return receipt;
        }
      } catch (error) {
        console.warn('⚠️ Error checking transaction:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Format FROTH amount for display
   * @param {string} amount - FROTH amount
   * @returns {string} - Formatted amount
   */
  formatAmount(amount) {
    const num = parseFloat(amount);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }

  /**
   * Get minimum bet amount for FROTH
   * @returns {string} - Minimum bet amount
   */
  getMinBet() {
    return FROTH_CONFIG.MIN_BET.toString();
  }

  /**
   * Get maximum bet amount for FROTH
   * @returns {string} - Maximum bet amount
   */
  getMaxBet() {
    return FROTH_CONFIG.MAX_BET.toString();
  }

  /**
   * Validate bet amount for FROTH
   * @param {string} amount - Bet amount to validate
   * @returns {object} - Validation result
   */
  validateBetAmount(amount) {
    const betAmount = parseFloat(amount);
    const minBet = FROTH_CONFIG.MIN_BET;
    const maxBet = FROTH_CONFIG.MAX_BET;

    if (isNaN(betAmount) || betAmount <= 0) {
      return {
        valid: false,
        error: 'Invalid bet amount'
      };
    }

    if (betAmount < minBet) {
      return {
        valid: false,
        error: `Minimum bet is ${minBet} FROTH`
      };
    }

    if (betAmount > maxBet) {
      return {
        valid: false,
        error: `Maximum bet is ${maxBet} FROTH`
      };
    }

    return {
      valid: true,
      error: null
    };
  }

  /**
   * Get treasury address for FROTH deposits
   * @returns {string} - Treasury EVM address
   */
  getTreasuryAddress() {
    // Treasury address on Flow EVM for FROTH deposits
    return process.env.NEXT_PUBLIC_FROTH_TREASURY_ADDRESS || "0x421055ba162a1f697532e79ea9a6852422d311f0993eb880c75110218d7f52c0";
  }
}

// Export singleton instance
export const frothService = new FrothService();
export default FrothService;