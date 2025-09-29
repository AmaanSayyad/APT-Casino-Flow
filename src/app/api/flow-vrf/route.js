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

    // Use Flow CLI to execute the casino game transaction
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    // Read the transaction file
    const txPath = path.join(process.cwd(), transactionFile);
    if (!fs.existsSync(txPath)) {
      return NextResponse.json(
        { error: 'Transaction file not found: ' + transactionFile },
        { status: 500 }
      );
    }
    
    let transactionId;
    let blockHeight;
    let randomNumber;
    
    try {
      // Execute Flow CLI command with game-specific arguments
      const argsString = transactionArgs.join(' ');
      const command = `flow transactions send ${txPath} ${argsString} --signer treasury --network testnet`;
      
      console.log('🔧 Executing Flow VRF transaction...');
      
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
      console.log('📝 VRF Transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed using FCL
      console.log('⏳ Waiting for VRF transaction to be sealed...');
      const sealedTx = await fcl.tx(transactionId).onceSealed();
      console.log('✅ VRF Transaction sealed:', sealedTx);
      
      // Check transaction status
      if (sealedTx.status !== 4) { // 4 = SEALED and successful
        console.error('VRF Transaction failed:', sealedTx);
        throw new Error(`VRF Transaction failed with status: ${sealedTx.status}`);
      }
      
      // Extract block height and game results from transaction events
      blockHeight = sealedTx.blockId;
      
      // Parse game results from transaction events
      let gameResult = {};
      if (sealedTx.events && sealedTx.events.length > 0) {
        const gameEvent = sealedTx.events.find(event => event.type.includes('GamePlayed'));
        if (gameEvent && gameEvent.data) {
          gameResult = gameEvent.data.gameResult || {};
          randomNumber = parseInt(gameEvent.data.randomSeed || '0');
        }
      }
      
      // Fallback random number if not found in events
      if (!randomNumber) {
        const seed = parseInt(transactionId.slice(-8), 16);
        randomNumber = Math.abs(seed);
      }
      
      // No temp file to clean up since we're using existing transaction files
      
    } catch (cliError) {
      // No temp file cleanup needed
      throw cliError;
    }

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