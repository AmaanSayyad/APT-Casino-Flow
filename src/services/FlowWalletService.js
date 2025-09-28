/**
 * Flow Wallet Service
 * Service for managing Flow wallet connections and operations
 */

import * as fcl from '@onflow/fcl';
import { FLOW_CONFIG } from '@/config/flowConfig';

class FlowWalletService {
  constructor() {
    this.isInitialized = false;
    this.user = null;
    this.networkConfig = null;
  }

  /**
   * Initialize the Flow wallet service
   */
  async initialize() {
    try {
      console.log('🔗 FLOW WALLET: Initializing Flow wallet service...');
      
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

      // Listen for user changes
      fcl.currentUser.subscribe((user) => {
        this.user = user;
        console.log('👤 FLOW WALLET: User updated:', user);
      });

      this.isInitialized = true;
      console.log('✅ FLOW WALLET: Service initialized successfully');
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Connect to Flow wallet
   * @returns {Promise<Object>} User object
   */
  async connect() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🔗 FLOW WALLET: Connecting to Flow wallet...');
      
      // Authenticate user
      const user = await fcl.authenticate();
      
      console.log('✅ FLOW WALLET: Connected successfully');
      console.log('👤 User address:', user.addr);
      
      return user;
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Flow wallet
   */
  async disconnect() {
    try {
      console.log('🔌 FLOW WALLET: Disconnecting...');
      
      await fcl.unauthenticate();
      
      console.log('✅ FLOW WALLET: Disconnected successfully');
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user object
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Check if user is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.user && this.user.loggedIn;
  }

  /**
   * Get user's Flow token balance
   * @returns {Promise<number>} Balance in FLOW tokens
   */
  async getFlowBalance() {
    try {
      if (!this.isConnected()) {
        throw new Error('User not connected');
      }

      const result = await fcl.query({
        cadence: `
          import FlowToken from 0xFlowToken

          pub fun main(address: Address): UFix64 {
            let account = getAccount(address)
            let vaultRef = account.getCapability(/public/flowTokenBalance)
              .borrow<&FlowToken.Vault{FungibleToken.Balance}>()
              ?? panic("Could not borrow Balance reference to the Vault")
            
            return vaultRef.balance
          }
        `,
        args: [fcl.arg(this.user.addr, fcl.t.Address)]
      });

      return parseFloat(result);
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Get user's FUSD balance
   * @returns {Promise<number>} Balance in FUSD tokens
   */
  async getFUSDBalance() {
    try {
      if (!this.isConnected()) {
        throw new Error('User not connected');
      }

      const result = await fcl.query({
        cadence: `
          import FungibleToken from 0x9a0766d93b6608b7
          import FUSD from 0xe223d8a629e49c68

          pub fun main(address: Address): UFix64 {
            let account = getAccount(address)
            let vaultRef = account.getCapability(/public/fusdBalance)
              .borrow<&FUSD.Vault{FungibleToken.Balance}>()
              ?? panic("Could not borrow Balance reference to the Vault")
            
            return vaultRef.balance
          }
        `,
        args: [fcl.arg(this.user.addr, fcl.t.Address)]
      });

      return parseFloat(result);
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Error getting FUSD balance:', error);
      throw error;
    }
  }

  /**
   * Transfer Flow tokens to another address
   * @param {string} toAddress - Recipient address
   * @param {number} amount - Amount to transfer
   * @returns {Promise<string>} Transaction ID
   */
  async transferFlow(toAddress, amount) {
    try {
      if (!this.isConnected()) {
        throw new Error('User not connected');
      }

      console.log(`💸 FLOW WALLET: Transferring ${amount} FLOW to ${toAddress}...`);

      const tx = await fcl.mutate({
        cadence: `
          import FlowToken from 0xFlowToken

          transaction(amount: UFix64, to: Address) {
            let sentVault: @FlowToken.Vault

            prepare(signer: AuthAccount) {
              let vaultRef = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                ?? panic("Could not borrow reference to the owner's Vault")
              
              self.sentVault <- vaultRef.withdraw(amount: amount)
            }

            execute {
              let recipient = getAccount(to)
              let receiverRef = recipient.getCapability(/public/flowTokenReceiver)
                .borrow<&{FungibleToken.Receiver}>()
                ?? panic("Could not borrow receiver reference to the recipient's Vault")
              
              receiverRef.deposit(from: <-self.sentVault)
            }
          }
        `,
        args: [
          fcl.arg(amount, fcl.t.UFix64),
          fcl.arg(toAddress, fcl.t.Address)
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser]
      });

      const result = await fcl.tx(tx).onceSealed();
      
      if (result.statusCode !== 4) {
        throw new Error(`Transaction failed: ${result.errorMessage}`);
      }

      console.log('✅ FLOW WALLET: Transfer successful');
      console.log('📝 Transaction ID:', result.transactionId);
      
      return result.transactionId;
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Transfer failed:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the user's private key
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    try {
      if (!this.isConnected()) {
        throw new Error('User not connected');
      }

      const signature = await fcl.currentUser.signUserMessage(message);
      return signature;
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Sign message failed:', error);
      throw error;
    }
  }

  /**
   * Get user's account info
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo() {
    try {
      if (!this.isConnected()) {
        throw new Error('User not connected');
      }

      const result = await fcl.query({
        cadence: `
          pub fun main(address: Address): {String: String} {
            let account = getAccount(address)
            return {
              "address": address.toString(),
              "balance": account.balance.toString(),
              "codeHash": account.codeHash.toString()
            }
          }
        `,
        args: [fcl.arg(this.user.addr, fcl.t.Address)]
      });

      return result;
      
    } catch (error) {
      console.error('❌ FLOW WALLET: Error getting account info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new FlowWalletService();
