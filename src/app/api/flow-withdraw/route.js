import { NextResponse } from 'next/server';
import * as fcl from "@onflow/fcl";

// Flow Treasury configuration  
const FLOW_TREASURY_PRIVATE_KEY = process.env.FLOW_TREASURY_PRIVATE_KEY
const FLOW_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS

// Configure FCL for server-side operations
fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
});

export async function POST(request) {
  try {
    const { userAddress, amount } = await request.json();

    console.log('📥 Received Flow withdrawal request:', { userAddress, amount, type: typeof userAddress });

    // Validate input
    if (!userAddress || !amount || amount <= 0) {
      return new Response(JSON.stringify({
        error: 'Invalid parameters'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    if (!FLOW_TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Flow treasury not configured' },
        { status: 500 }
      );
    }

    console.log(`🏦 Processing Flow withdrawal: ${amount} FLOW to ${userAddress}`);
    console.log(`📍 Flow Treasury: ${FLOW_TREASURY_ADDRESS}`);

    // Check treasury balance using native balance (more reliable)
    let treasuryBalance = 0;
    try {
      treasuryBalance = await fcl.query({
        cadence: `
          access(all) fun main(account: Address): UFix64 {
            let acct = getAccount(account)
            return acct.balance
          }
        `,
        args: (arg, t) => [arg(FLOW_TREASURY_ADDRESS, t.Address)],
      });

      console.log(`💰 Flow Treasury native balance: ${treasuryBalance} FLOW`);

      // If native balance is 0, try FlowToken vault balance as fallback
      if (parseFloat(treasuryBalance) === 0) {
        console.log('🔄 Native balance is 0, trying FlowToken vault...');
        try {
          const vaultBalance = await fcl.query({
            cadence: `
              import FungibleToken from 0x9a0766d93b6608b7
              import FlowToken from 0x7e60df042a9c0868
              
              access(all) fun main(account: Address): UFix64 {
                let acct = getAccount(account)
                let vaultCap = acct.capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
                
                if !vaultCap.check() {
                  return 0.0
                }
                
                let vaultRef = vaultCap.borrow()
                return vaultRef?.balance ?? 0.0
              }
            `,
            args: (arg, t) => [arg(FLOW_TREASURY_ADDRESS, t.Address)],
          });

          treasuryBalance = vaultBalance;
          console.log(`💰 Flow Treasury vault balance: ${treasuryBalance} FLOW`);
        } catch (vaultError) {
          console.warn('⚠️ Could not check vault balance:', vaultError.message);
        }
      }

    } catch (balanceError) {
      console.log('⚠️ Could not check Flow treasury balance, proceeding with transfer attempt...');
      console.log('Balance error:', balanceError.message);

      // If balance check fails, assume we have enough and let the transaction fail if needed
      treasuryBalance = 999999; // Large number to bypass the check
    }

    // Check if treasury has sufficient funds
    const requestedAmount = parseFloat(amount);
    const availableBalance = parseFloat(treasuryBalance);

    console.log(`🔍 Balance check: Available=${availableBalance}, Requested=${requestedAmount}`);

    if (availableBalance < requestedAmount) {
      console.warn(`⚠️ Insufficient treasury balance detected, but proceeding with transaction...`);
      console.warn(`Available: ${availableBalance} FLOW, Requested: ${requestedAmount} FLOW`);

      // Don't fail here - let the actual transaction determine if there are sufficient funds
      // The Flow transaction will fail with a proper error if insufficient funds
    }

    // Format user address for Flow
    let formattedUserAddress = userAddress;
    if (!userAddress.startsWith('0x')) {
      formattedUserAddress = `0x${userAddress}`;
    }

    console.log('🔧 Formatted user address:', formattedUserAddress);
    console.log('🔧 Treasury account:', FLOW_TREASURY_ADDRESS);
    console.log('🔧 Amount:', requestedAmount);

    // Execute real Flow transaction from treasury to user
    console.log('🔧 Executing Flow transaction from treasury to user...');

    // Create the Cadence transaction
    const cadence = `
      import FungibleToken from 0x9a0766d93b6608b7
      import FlowToken from 0x7e60df042a9c0868

      transaction(amount: UFix64, recipientAddress: Address) {
          
          let sentVault: @{FungibleToken.Vault}
          
          prepare(treasury: auth(BorrowValue) &Account) {
              
              let vaultRef = treasury.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                  from: /storage/flowTokenVault
              ) ?? panic("Could not borrow reference to the treasury's Vault!")

              if vaultRef.balance < amount {
                  panic("Insufficient FLOW balance in treasury")
              }

              self.sentVault <- vaultRef.withdraw(amount: amount)
          }

          execute {
              let recipient = getAccount(recipientAddress)

              let receiverRef = recipient.capabilities.borrow<&{FungibleToken.Receiver}>(
                  /public/flowTokenReceiver
              ) ?? panic("Could not borrow receiver reference to the recipient account")

              receiverRef.deposit(from: <-self.sentVault)
              
              log("Successfully transferred FLOW from treasury to user")
          }
      }
    `;

    // Execute real Flow transaction from treasury to user
    if (!FLOW_TREASURY_PRIVATE_KEY) {
      throw new Error('Treasury private key not configured');
    }

    console.log('🔐 Executing Flow transaction from treasury...');

    // Create authorization function for server-side signing
    const authz = async (account) => {
      return {
        ...account,
        addr: FLOW_TREASURY_ADDRESS,
        keyId: 0,
        signingFunction: async (signable) => {
          // For now, we'll use a placeholder since proper signing requires crypto libraries
          // In production, you'd implement proper ECDSA signing here
          throw new Error('Server-side signing not yet implemented. Please use Flow CLI for now.');
        }
      };
    };

    // Use Flow CLI to execute the transaction
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    // Create temporary transaction file
    const txPath = path.join(process.cwd(), 'temp_withdraw.cdc');
    fs.writeFileSync(txPath, cadence);

    let transactionId;
    let sealedTx;

    try {
      // Execute Flow CLI command
      const command = `flow transactions send ${txPath} ${requestedAmount.toFixed(8)} ${formattedUserAddress} --signer treasury --network testnet`;

      console.log('🔧 Executing Flow CLI command:', command);

      const { stdout, stderr } = await new Promise((resolve, reject) => {
        exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
          if (error) {
            console.error('Flow CLI error:', error);
            console.error('stderr:', stderr);
            reject(new Error(`Flow CLI execution failed: ${error.message}`));
            return;
          }
          resolve({ stdout, stderr });
        });
      });

      console.log('Flow CLI stdout:', stdout);
      if (stderr) console.log('Flow CLI stderr:', stderr);

      // Parse transaction ID from stdout
      const txIdMatch = stdout.match(/Transaction ID: ([a-f0-9]+)/);
      if (!txIdMatch) {
        throw new Error('Could not parse transaction ID from Flow CLI output');
      }

      transactionId = txIdMatch[1];
      console.log('📝 Transaction submitted via Flow CLI:', transactionId);

      // Wait for transaction to be sealed using FCL
      console.log('⏳ Waiting for transaction to be sealed...');
      sealedTx = await fcl.tx(transactionId).onceSealed();
      console.log('✅ Transaction sealed:', sealedTx);

      // Check transaction status
      if (sealedTx.status !== 4) { // 4 = SEALED and successful
        console.error('Transaction failed:', sealedTx);
        throw new Error(`Transaction failed with status: ${sealedTx.status}. Error: ${sealedTx.errorMessage || 'Unknown error'}`);
      }

      // Clean up temp file
      fs.unlinkSync(txPath);

    } catch (cliError) {
      // Clean up temp file on error
      if (fs.existsSync(txPath)) {
        fs.unlinkSync(txPath);
      }
      throw cliError;
    }

    console.log(`✅ Flow withdrawal transaction completed: ${amount} FLOW to ${userAddress}, TX: ${transactionId}`);

    return NextResponse.json({
      success: true,
      transactionId: transactionId,
      amount: amount,
      userAddress: userAddress,
      treasuryAddress: FLOW_TREASURY_ADDRESS,
      status: 'sealed',
      blockchain: 'flow',
      message: 'Flow withdrawal completed successfully.',
      blockId: sealedTx.blockId,
      events: sealedTx.events
    });

  } catch (error) {
    console.error('Flow withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
