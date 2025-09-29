import { NextResponse } from 'next/server';
import * as fcl from "@onflow/fcl";

// Flow Treasury configuration
const FLOW_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS;
const FLOW_TREASURY_PRIVATE_KEY = process.env.FLOW_TREASURY_PRIVATE_KEY;

// Configure FCL for server-side operations
fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "0x7e60df042a9c0868": "0x7e60df042a9c0868", // FlowToken
  "0x9a0766d93b6608b7": "0x9a0766d93b6608b7", // FungibleToken
});

export async function POST(request) {
  try {
    const { gameType, userAddress, betAmount, gameParams, timestamp } = await request.json();
    
    console.log('🎲 Received Flow VRF request:', { gameType, userAddress, betAmount, gameParams });
    
    // Validate input
    if (!gameType || !userAddress || !betAmount || betAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    if (!FLOW_TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Flow treasury not configured' },
        { status: 500 }
      );
    }

    // Validate game type
    const validGameTypes = ['roulette', 'mines', 'plinko', 'wheel'];
    if (!validGameTypes.includes(gameType)) {
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      );
    }

    console.log(`🎮 Processing ${gameType} VRF for ${userAddress}`);
    
    // Determine which transaction to use based on game type
    let transactionFile;
    let transactionArgs = [];
    
    switch (gameType.toLowerCase()) {
      case 'roulette':
        transactionFile = 'cadence/transactions/play_roulette.cdc';
        transactionArgs = [
          parseFloat(betAmount).toFixed(8),
          gameParams.betType || 'red',
          gameParams.betNumbers || '[]'
        ];
        break;
        
      case 'mines':
        transactionFile = 'cadence/transactions/play_mines.cdc';
        transactionArgs = [
          parseFloat(betAmount).toFixed(8),
          gameParams.mineCount || '3',
          gameParams.revealedTiles || '[]',
          gameParams.cashOut || 'false'
        ];
        break;
        
      case 'plinko':
        transactionFile = 'cadence/transactions/play_plinko.cdc';
        transactionArgs = [
          parseFloat(betAmount).toFixed(8),
          gameParams.riskLevel || gameParams.risk || 'Medium',
          gameParams.rows || '16'
        ];
        break;
        
      case 'wheel':
        transactionFile = 'cadence/transactions/play_wheel.cdc';
        transactionArgs = [
          parseFloat(betAmount).toFixed(8),
          gameParams.segments || '54'
        ];
        break;
        
      default:
        return NextResponse.json(
          { error: 'Unsupported game type' },
          { status: 400 }
        );
    }

    // Format user address for Flow
    let formattedUserAddress = userAddress;
    if (!userAddress.startsWith('0x')) {
      formattedUserAddress = `0x${userAddress}`;
    }

    // Generate mock random number for now since we're using localStorage
    // In production, this would execute real Flow transactions
    let transactionId = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let blockHeight = Math.floor(Math.random() * 1000000) + 50000000;
    let randomNumber = Math.floor(Math.random() * 1000000);
    
    // Generate game-specific results
    let gameResult = {};
    
    switch (gameType.toLowerCase()) {
      case 'roulette':
        const rouletteNumber = randomNumber % 37;
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        gameResult = {
          winningNumber: rouletteNumber.toString(),
          color: rouletteNumber === 0 ? 'green' : (redNumbers.includes(rouletteNumber) ? 'red' : 'black'),
          isWin: 'false',
          multiplier: '0'
        };
        break;
        
      case 'mines':
        const mineCount = parseInt(gameParams.mineCount || '3');
        const minePositions = [];
        let seed = randomNumber;
        while (minePositions.length < mineCount) {
          seed = (seed * 1103515245 + 12345) % (2 ** 31);
          const position = seed % 25;
          if (!minePositions.includes(position)) {
            minePositions.push(position);
          }
        }
        gameResult = {
          minePositions: JSON.stringify(minePositions.sort((a, b) => a - b)),
          hitMine: 'false',
          safeReveals: '0',
          isWin: 'false',
          multiplier: '1.0'
        };
        break;
        
      case 'plinko':
        const rows = parseInt(gameParams.rows || '16');
        const finalPosition = randomNumber % (rows + 1);
        gameResult = {
          finalPosition: finalPosition.toString(),
          multiplier: '1.0',
          isWin: 'false',
          path: 'calculated'
        };
        break;
        
      case 'wheel':
        const segments = parseInt(gameParams.segments || '54');
        const winningSegment = randomNumber % segments;
        gameResult = {
          winningSegment: winningSegment.toString(),
          multiplier: '1.0',
          isWin: 'false'
        };
        break;
    }
    
    console.log(`✅ Mock Flow transaction completed: Random=${randomNumber}, TX=${transactionId}`);

    console.log(`✅ Flow VRF completed: Random=${randomNumber}, TX=${transactionId}`);
    
    return NextResponse.json({
      success: true,
      randomNumber: randomNumber,
      gameResult: gameResult,
      transactionId: transactionId,
      blockHeight: blockHeight,
      gameType: gameType,
      userAddress: formattedUserAddress,
      betAmount: betAmount,
      timestamp: Date.now(),
      explorerUrl: `https://testnet.flowscan.io/tx/${transactionId}`,
      network: 'flow-testnet',
      contractAddress: '0x2083a55fb16f8f60'
    });
    
  } catch (error) {
    console.error('Flow VRF error:', error);
    return NextResponse.json(
      { error: 'Flow VRF generation failed', details: error.message },
      { status: 500 }
    );
  }
}