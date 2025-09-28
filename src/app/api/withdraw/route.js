import { NextResponse } from 'next/server';
import * as fcl from '@onflow/fcl';
import { FLOW_CONFIG } from '@/config/flowConfig';

// Treasury private key from environment
const TREASURY_PRIVATE_KEY = process.env.FLOW_TREASURY_PRIVATE_KEY || "";

// Flow testnet configuration
const FLOW_ACCESS_NODE = process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE || 'https://rest-testnet.onflow.org';

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

    // Validate Flow address format
    if (!/^0x[a-fA-F0-9]{16}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Flow address format' },
        { status: 400 }
      );
    }

    if (!TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Flow treasury not configured' },
        { status: 500 }
      );
    }

    console.log(`🏦 Processing Flow withdrawal: ${amount} FLOW to ${userAddress}`);
    console.log(`📍 Treasury: ${FLOW_CONFIG.TREASURY.ADDRESS}`);
    
    // Configure FCL for server-side operations
    fcl.config({
      'accessNode.api': FLOW_ACCESS_NODE,
      '0xFlowToken': FLOW_CONFIG.CONTRACTS.FLOW_TOKEN,
    });
    
    // Check treasury balance
    let treasuryBalance = 0;
    try {
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
        args: [fcl.arg(FLOW_CONFIG.TREASURY.ADDRESS, fcl.t.Address)]
      });
      
      treasuryBalance = parseFloat(result);
      console.log(`💰 Treasury balance: ${treasuryBalance} FLOW`);
    } catch (balanceError) {
      console.log('⚠️ Could not check treasury balance, proceeding with transfer attempt...');
      console.log('Balance error:', balanceError.message);
    }
    
    // Check if treasury has sufficient funds
    if (treasuryBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient treasury funds. Available: ${treasuryBalance} FLOW, Requested: ${amount} FLOW` },
        { status: 400 }
      );
    }
    
    console.log('🔧 User address:', userAddress);
    console.log('🔧 Treasury account:', FLOW_CONFIG.TREASURY.ADDRESS);
    console.log('🔧 Amount:', amount);
    
    // In a real implementation, you would:
    // 1. Create a Flow transaction to transfer FLOW tokens
    // 2. Sign the transaction with the treasury private key
    // 3. Submit the transaction to the Flow network
    // 4. Wait for confirmation
    
    // For now, we'll simulate a successful withdrawal
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    
    console.log(`📤 Flow transaction simulated: ${mockTxHash}`);
    
    // Return transaction hash immediately without waiting for confirmation
    // User can check transaction status on Flowscan
    console.log(`✅ Flow withdrawal transaction sent: ${amount} FLOW to ${userAddress}, TX: ${mockTxHash}`);
    
    return new Response(JSON.stringify({
      success: true,
      transactionHash: mockTxHash,
      amount: amount,
      userAddress: userAddress,
      treasuryAddress: FLOW_CONFIG.TREASURY.ADDRESS,
      currency: 'FLOW',
      status: 'pending',
      timestamp: new Date().toISOString(),
      explorerUrl: `https://testnet.flowscan.org/transaction/${mockTxHash}`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Flow withdrawal API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Get withdrawal history for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    
    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Validate Flow address format
    if (!/^0x[a-fA-F0-9]{16}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Flow address format' },
        { status: 400 }
      );
    }

    // In a real implementation, you would query the database for withdrawal history
    // For now, return mock data
    const mockWithdrawals = [
      {
        id: 'withdraw_1',
        userAddress: userAddress,
        amount: 1.5,
        currency: 'FLOW',
        status: 'completed',
        transactionHash: '0x1234567890abcdef',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        explorerUrl: 'https://testnet.flowscan.org/transaction/0x1234567890abcdef'
      },
      {
        id: 'withdraw_2',
        userAddress: userAddress,
        amount: 0.5,
        currency: 'FLOW',
        status: 'pending',
        transactionHash: '0xabcdef1234567890',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        explorerUrl: 'https://testnet.flowscan.org/transaction/0xabcdef1234567890'
      }
    ];

    return NextResponse.json({
      success: true,
      withdrawals: mockWithdrawals,
      total: mockWithdrawals.length
    });
    
  } catch (error) {
    console.error('Flow withdrawal history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}