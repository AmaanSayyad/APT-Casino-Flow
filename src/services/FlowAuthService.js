// Flow Authorization Service
// Provides FCL-compatible authorization for server-side transaction signing
// Replaces Flow CLI dependency with pure JavaScript implementation

import * as fcl from "@onflow/fcl";
import { SHA3 } from "sha3";
import { ec as EC } from "elliptic";

/**
 * Flow Authorization Service
 * Handles server-side transaction signing using private keys
 */
export class FlowAuthService {
  constructor(address, privateKey, keyId = 0) {
    this.address = address;
    this.privateKey = privateKey;
    this.keyId = keyId;
    
    // Flow uses secp256k1 curve, not p256
    this.curve = new EC('secp256k1');
    
    // Remove 0x prefix if present
    this.cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    this.cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
    
    console.log('🔐 FlowAuthService initialized for address:', address);
    console.log('🔑 Using secp256k1 curve for Flow compatibility');
  }

  /**
   * Hash message for signing (Flow-compatible SHA2-256)
   */
  hashMessage(message) {
    // Flow uses SHA2-256, not SHA3
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(Buffer.from(message, 'hex')).digest();
  }

  /**
   * Sign message with private key (ECDSA secp256k1 for Flow)
   */
  signMessage(message) {
    try {
      const hash = this.hashMessage(message);
      const key = this.curve.keyFromPrivate(this.cleanPrivateKey, 'hex');
      const signature = key.sign(hash, { canonical: true });
      
      // Convert to Flow-compatible format (64 bytes: 32 bytes r + 32 bytes s)
      const r = signature.r.toArrayLike(Buffer, 'be', 32);
      const s = signature.s.toArrayLike(Buffer, 'be', 32);
      
      const finalSignature = Buffer.concat([r, s]).toString('hex');
      console.log('🔐 Generated signature:', finalSignature.substring(0, 16) + '...');
      
      return finalSignature;
    } catch (error) {
      console.error('❌ Signing failed:', error);
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }

  /**
   * Create FCL-compatible authorization function
   */
  createAuthz() {
    const self = this;
    
    return function(account = {}) {
      return {
        ...account,
        tempId: `${self.address}-${self.keyId}`,
        addr: fcl.sansPrefix(self.address),
        keyId: self.keyId,
        signingFunction: function(signable) {
          console.log('🔐 Signing transaction with treasury key...');
          console.log('🔍 Signable message preview:', signable.message?.substring(0, 32) + '...');
          
          try {
            const signature = self.signMessage(signable.message);
            
            console.log('✅ Signature generated successfully');
            return {
              addr: fcl.sansPrefix(self.address),
              keyId: self.keyId,
              signature: signature
            };
          } catch (error) {
            console.error('❌ Transaction signing failed:', error);
            throw new Error(`Transaction signing failed: ${error.message}`);
          }
        }
      };
    };
  }

  /**
   * Execute a Flow transaction using FCL
   */
  async executeTransaction(cadence, args = [], gasLimit = 1000) {
    try {
      console.log('🚀 Executing Flow transaction via FCL...');
      console.log('📝 Transaction cadence preview:', cadence.substring(0, 100) + '...');
      console.log('📝 Args type:', typeof args);
      console.log('📝 Args function check:', typeof args === 'function');
      
      const authz = this.createAuthz();
      
      // Execute transaction
      const transactionId = await fcl.mutate({
        cadence,
        args,
        limit: gasLimit,
        payer: authz,
        proposer: authz,
        authorizations: [authz]
      });

      console.log('📝 Transaction submitted:', transactionId);

      if (!transactionId) {
        throw new Error('Transaction ID not received from Flow network');
      }

      // Wait for transaction to be sealed
      console.log('⏳ Waiting for transaction to be sealed...');
      const sealedTransaction = await fcl.tx(transactionId).onceSealed();
      
      console.log('✅ Transaction sealed:', {
        id: transactionId,
        status: sealedTransaction.status,
        events: sealedTransaction.events?.length || 0
      });

      // Check transaction status
      if (sealedTransaction.status !== 4) { // 4 = SEALED and successful
        const errorMsg = sealedTransaction.errorMessage || 'Unknown transaction error';
        console.error('❌ Transaction failed:', errorMsg);
        throw new Error(`Transaction failed: ${errorMsg}`);
      }

      return {
        ...sealedTransaction,
        id: transactionId,
        transactionId: transactionId,
        success: true
      };

    } catch (error) {
      console.error('❌ FCL transaction execution failed:', error);
      throw new Error(`FCL transaction failed: ${error.message}`);
    }
  }

  /**
   * Execute a Flow script (read-only)
   */
  async executeScript(cadence, args = []) {
    try {
      console.log('📖 Executing Flow script via FCL...');
      
      const result = await fcl.query({
        cadence,
        args
      });

      console.log('✅ Script executed successfully');
      return result;

    } catch (error) {
      console.error('❌ FCL script execution failed:', error);
      throw new Error(`FCL script failed: ${error.message}`);
    }
  }
}

/**
 * Create Treasury Authorization Service
 * Pre-configured for the casino treasury account
 */
export function createTreasuryAuthService() {
  const treasuryAddress = process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS;
  const treasuryPrivateKey = process.env.FLOW_TREASURY_PRIVATE_KEY;

  if (!treasuryAddress || !treasuryPrivateKey) {
    throw new Error('Treasury configuration missing: NEXT_PUBLIC_FLOW_TREASURY_ADDRESS and FLOW_TREASURY_PRIVATE_KEY required');
  }

  return new FlowAuthService(treasuryAddress, treasuryPrivateKey, 0);
}

/**
 * Initialize FCL for server-side operations
 */
export function initializeFCL() {
  fcl.config({
    "accessNode.api": "https://rest-testnet.onflow.org",
    "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
    "0x7e60df042a9c0868": "0x7e60df042a9c0868", // FlowToken
    "0x9a0766d93b6608b7": "0x9a0766d93b6608b7", // FungibleToken
  });
  
  console.log('✅ FCL initialized for server-side operations');
}
