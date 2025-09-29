import { NextResponse } from 'next/server';
import * as fcl from "@onflow/fcl";
import { createTreasuryAuthService, initializeFCL } from '../../../services/FlowAuthService.js';

// Flow Treasury configuration  
const FLOW_TREASURY_PRIVATE_KEY = process.env.FLOW_TREASURY_PRIVATE_KEY
const FLOW_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS

// Initialize FCL for server-side operations
initializeFCL();

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

    // Execute real Flow transaction from treasury to user using FCL
    if (!FLOW_TREASURY_PRIVATE_KEY) {
      throw new Error('Treasury private key not configured');
    }

    console.log('🔐 Executing Flow transaction from treasury using FCL...');

    // Create treasury authorization service
    const treasuryAuth = createTreasuryAuthService();

    // Prepare transaction arguments
    const args = (arg, t) => [
      arg(requestedAmount.toFixed(8), t.UFix64),
      arg(formattedUserAddress, t.Address)
    ];

    // Execute transaction using FCL
    const sealedTx = await treasuryAuth.executeTransaction(cadence, args, 1000);
    const transactionId = sealedTx.transactionId;

    console.log(`✅ Flow withdrawal transaction completed: ${amount} FLOW to ${userAddress}, TX: ${transactionId}`);

    return NextResponse.json({
      success: true,
      transactionId: transactionId,
      amount: amount,
      userAddress: userAddress,
      treasuryAddress: FLOW_TREASURY_ADDRESS,
      status: 'sealed',
      blockchain: 'flow',
      message: 'Flow withdrawal completed successfully via FCL.',
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
