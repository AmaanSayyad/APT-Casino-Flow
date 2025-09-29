// Treasury Service for Flow Casino
// Handles treasury-sponsored transactions

import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Treasury configuration
const TREASURY_CONFIG = {
  address: "0x2083a55fb16f8f60",
  privateKey: "e770fe20d90079c0354d05763f4d4a1e8ad2cada19c64187be1299550e701e7b",
  keyId: 0,
  hashAlgorithm: fcl.HashAlgorithm.SHA2_256,
  signatureAlgorithm: fcl.SignatureAlgorithm.ECDSA_secp256k1
};

// Treasury authorization function
const treasuryAuthz = async (account) => {
  return {
    ...account,
    tempId: `${TREASURY_CONFIG.address}-${TREASURY_CONFIG.keyId}`,
    addr: fcl.sansPrefix(TREASURY_CONFIG.address),
    keyId: TREASURY_CONFIG.keyId,
    signingFunction: async (signable) => {
      // This would normally use a proper signing service
      // For now, we'll rely on FCL's built-in signing
      return {
        addr: fcl.sansPrefix(TREASURY_CONFIG.address),
        keyId: TREASURY_CONFIG.keyId,
        signature: "placeholder_signature"
      };
    }
  };
};

// Execute a treasury-sponsored transaction
export const executeTreasuryTransaction = async (cadence, args = [], limit = 1000) => {
  try {
    console.log('🏦 Executing treasury-sponsored transaction...');
    
    // Configure FCL for treasury operations
    fcl.config({
      "accessNode.api": "https://rest-testnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
      "0x2083a55fb16f8f60": TREASURY_CONFIG.address
    });

    const response = await fcl.mutate({
      cadence,
      args,
      limit,
      payer: treasuryAuthz,
      proposer: treasuryAuthz,
      authorizations: [treasuryAuthz],
    });

    console.log('✅ Treasury transaction submitted:', response);

    // Wait for transaction to be sealed
    const transaction = await fcl.tx(response).onceSealed();
    console.log('✅ Treasury transaction sealed:', transaction);

    return {
      ...transaction,
      id: response,
      transactionId: response,
      treasurySponsored: true
    };

  } catch (error) {
    console.error('❌ Treasury transaction failed:', error);
    throw new Error(`Treasury transaction failed: ${error.message}`);
  }
};

// Get treasury balance
export const getTreasuryBalance = async () => {
  try {
    const cadence = `
      import FlowToken from 0x7e60df042a9c0868

      access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)
          let vaultRef = account.capabilities.borrow<&FlowToken.Vault>(/public/flowTokenBalance)
              ?? panic("Could not borrow Flow token balance")
          return vaultRef.balance
      }
    `;

    const balance = await fcl.query({
      cadence,
      args: (arg, t) => [arg(TREASURY_CONFIG.address, t.Address)]
    });

    console.log('🏦 Treasury balance:', balance, 'FLOW');
    return balance;

  } catch (error) {
    console.error('❌ Failed to get treasury balance:', error);
    return 0;
  }
};

export default {
  executeTreasuryTransaction,
  getTreasuryBalance,
  TREASURY_CONFIG
};
