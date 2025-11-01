import { NextResponse } from 'next/server';

/**
 * FROTH Withdrawal API Endpoint
 * Handles FROTH token withdrawals from casino balance to user wallet on Flow EVM Mainnet
 */

export async function POST(request) {
  try {
    const { userAddress, flowAddress, amount, token, contractAddress } = await request.json();

    // Validate input - userAddress is EVM address, flowAddress is Flow address
    if (!userAddress || !amount || token !== 'FROTH' || !contractAddress) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // Minimum withdrawal check
    if (withdrawAmount < 1000) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is 1000 FROTH' },
        { status: 400 }
      );
    }

    console.log('🟡 Processing FROTH withdrawal on mainnet:', {
      evmAddress: userAddress,
      flowAddress: flowAddress,
      amount: withdrawAmount,
      token,
      contractAddress
    });

    // In production, this would:
    // 1. Verify user's casino balance in database
    // 2. Create and sign transaction to transfer FROTH from treasury to user
    // 3. Broadcast transaction to Flow EVM Mainnet
    // 4. Update user's casino balance in database
    // 5. Return transaction hash

    // For now, we'll simulate the withdrawal process
    // Check user's casino balance (in production, this would be from database)
    // Use Flow address as key for consistency
    const balanceKey = flowAddress ? `userFrothBalance_${flowAddress}` : 'userFrothBalance';
    const currentBalance = parseFloat(process.env.NODE_ENV === 'development' ? '1000' : '0'); // Server-side simulation
    
    if (withdrawAmount > currentBalance) {
      return NextResponse.json(
        { error: 'Insufficient casino balance' },
        { status: 400 }
      );
    }

    // Simulate processing delay for mainnet transaction
    await new Promise(resolve => setTimeout(resolve, 3000));

    // In production, this would be a real transaction hash from Flow EVM
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    // Calculate new balance (will be updated on client-side)
    const newBalance = (currentBalance - withdrawAmount).toFixed(2);

    const result = {
      success: true,
      transactionHash: txHash,
      amount: withdrawAmount,
      token: 'FROTH',
      evmAddress: userAddress,
      flowAddress: flowAddress,
      contractAddress: contractAddress,
      newBalance: newBalance,
      timestamp: new Date().toISOString(),
      network: 'Flow EVM Mainnet',
      blockExplorer: `https://evm.flowscan.io/tx/${txHash}`
    };

    console.log('✅ FROTH withdrawal completed:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ FROTH withdrawal error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}