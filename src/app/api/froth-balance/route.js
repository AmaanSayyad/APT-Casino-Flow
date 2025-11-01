import { NextResponse } from 'next/server';

/**
 * FROTH Balance API Endpoint
 * Gets FROTH token balance from Flow EVM Mainnet
 */

// ERC-20 ABI for balanceOf function
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  }
];

export async function POST(request) {
  try {
    const { userAddress, contractAddress } = await request.json();

    // Validate input
    if (!userAddress || !contractAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching FROTH balance for:', userAddress);

    // Use Flow EVM RPC to get balance
    const rpcUrl = 'https://mainnet.evm.nodes.onflow.org';
    
    // Encode balanceOf function call
    const functionSelector = '0x70a08231'; // balanceOf(address)
    const paddedAddress = userAddress.slice(2).padStart(64, '0');
    const data = functionSelector + paddedAddress;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: data
          },
          'latest'
        ],
        id: 1
      })
    });

    const rpcResult = await response.json();

    if (rpcResult.error) {
      throw new Error(`RPC Error: ${rpcResult.error.message}`);
    }

    // Convert hex result to decimal and format
    const balanceHex = rpcResult.result;
    const balanceWei = BigInt(balanceHex);
    const balanceFormatted = (Number(balanceWei) / Math.pow(10, 18)).toFixed(2);

    console.log('✅ FROTH balance fetched:', balanceFormatted);

    return NextResponse.json({
      success: true,
      balance: balanceFormatted,
      userAddress: userAddress,
      contractAddress: contractAddress,
      network: 'Flow EVM Mainnet'
    });

  } catch (error) {
    console.error('❌ FROTH balance fetch error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch FROTH balance',
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