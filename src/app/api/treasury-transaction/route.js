// Treasury Transaction API Endpoint
// Handles treasury-sponsored transactions server-side to avoid user wallet interaction
// Now using FCL instead of Flow CLI for Vercel compatibility

import { createTreasuryAuthService, initializeFCL } from '../../../services/FlowAuthService.js';
import * as fcl from "@onflow/fcl";

// Initialize FCL for server-side operations
initializeFCL();

// Treasury configuration
const TREASURY_CONFIG = {
  address: "0x2083a55fb16f8f60",
  privateKey: "e770fe20d90079c0354d05763f4d4a1e8ad2cada19c64187be1299550e701e7b",
  keyId: 0
};

// Game transaction templates
const GAME_TRANSACTIONS = {
  roulette: `
    import CasinoGames from 0x2083a55fb16f8f60

    transaction(
        playerAddress: Address,
        betAmount: UFix64,
        betType: String,
        betNumbers: [UInt8]
    ) {
        
        var gameResult: CasinoGames.GameResult?
        
        prepare(treasury: auth(BorrowValue) &Account) {
            log("🏦 Treasury sponsoring roulette game for player: ".concat(playerAddress.toString()))
            log("💰 Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
            log("🎯 Bet type: ".concat(betType))
            
            // Initialize gameResult to nil (Cadence 1.0 requirement)
            self.gameResult = nil
        }
        
        execute {
            self.gameResult = CasinoGames.playRoulette(
                player: playerAddress,
                betAmount: betAmount,
                betType: betType,
                betNumbers: betNumbers
            )
            
            log("✅ Treasury-sponsored roulette game completed!")
            log("🎯 Winning number: ".concat(self.gameResult!.result["winningNumber"] ?? "unknown"))
            log("💎 Payout: ".concat(self.gameResult!.payout.toString()).concat(" FLOW"))
        }
        
        post {
            self.gameResult != nil: "Game result must be set"
            self.gameResult!.gameType == "ROULETTE": "Game type must be ROULETTE"
            self.gameResult!.player == playerAddress: "Player address must match"
        }
    }
  `,
  
  mines: `
    import CasinoGames from 0x2083a55fb16f8f60

    transaction(
        playerAddress: Address,
        betAmount: UFix64,
        mineCount: UInt8,
        revealedTiles: [UInt8],
        cashOut: Bool
    ) {
        
        var gameResult: CasinoGames.GameResult?
        
        prepare(treasury: auth(BorrowValue) &Account) {
            log("🏦 Treasury sponsoring mines game for player: ".concat(playerAddress.toString()))
            log("💰 Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
            log("💣 Mine count: ".concat(mineCount.toString()))
            
            // Initialize gameResult to nil (Cadence 1.0 requirement)
            self.gameResult = nil
        }
        
        execute {
            self.gameResult = CasinoGames.playMines(
                player: playerAddress,
                betAmount: betAmount,
                mineCount: mineCount,
                revealedTiles: revealedTiles,
                cashOut: cashOut
            )
            
            log("✅ Treasury-sponsored mines game completed!")
            log("💣 Hit mine: ".concat(self.gameResult!.result["hitMine"] ?? "false"))
            log("💎 Payout: ".concat(self.gameResult!.payout.toString()).concat(" FLOW"))
        }
        
        post {
            self.gameResult != nil: "Game result must be set"
            self.gameResult!.gameType == "MINES": "Game type must be MINES"
            self.gameResult!.player == playerAddress: "Player address must match"
        }
    }
  `,
  
  wheel: `
    import CasinoGames from 0x2083a55fb16f8f60

    transaction(
        playerAddress: Address,
        betAmount: UFix64,
        segments: UInt8,
        winningSegment: UInt8,
        multiplier: UFix64,
        wheelPosition: UFix64,
        calculatedSegment: UInt8
    ) {
        var gameResult: CasinoGames.GameResult?

        prepare(treasury: auth(BorrowValue) &Account) {
            log("🏦 Treasury-sponsored Wheel transaction")
            log("Player address: ".concat(playerAddress.toString()))
            log("Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
            log("Segments: ".concat(segments.toString()))
            log("🎯 Frontend winning segment: ".concat(winningSegment.toString()))
            log("🎯 Frontend multiplier: ".concat(multiplier.toString()))
            log("🎯 Frontend wheel position: ".concat(wheelPosition.toString()))
            log("🎯 Frontend calculated segment: ".concat(calculatedSegment.toString()))
            log("Treasury address: ".concat(treasury.address.toString()))
            
            // Initialize gameResult to nil
            self.gameResult = nil
        }

        execute {
            self.gameResult = CasinoGames.playWheelWithFullData(
                player: playerAddress,
                betAmount: betAmount,
                segments: segments,
                frontendSegment: winningSegment,
                frontendMultiplier: multiplier,
                frontendWheelPosition: wheelPosition,
                frontendCalculatedSegment: calculatedSegment
            )
            
            log("✅ Treasury-sponsored Wheel game completed!")
            log("🎯 Frontend predicted segment: ".concat(winningSegment.toString()))
            log("🎯 Frontend predicted multiplier: ".concat(multiplier.toString()))
            log("🎯 Frontend wheel position: ".concat(wheelPosition.toString()))
            log("🎯 Frontend calculated segment: ".concat(calculatedSegment.toString()))
            if let result = self.gameResult {
                log("🎰 Actual winning segment: ".concat(result.result["winningSegment"] ?? "unknown"))
                log("🎰 Actual multiplier: ".concat(result.result["multiplier"] ?? "unknown"))
                log("🔢 Random seed: ".concat(result.randomSeed.toString()))
                log("💎 Payout: ".concat(result.payout.toString()).concat(" FLOW"))
            }
        }

        post {
            self.gameResult != nil: "Game result must be set"
            self.gameResult!.gameType == "WHEEL": "Game type must be WHEEL"
            self.gameResult!.player == playerAddress: "Player address must match"
            self.gameResult!.betAmount == betAmount: "Bet amount must match"
        }
    }
  `,
  
  plinko: `
    import CasinoGames from 0x2083a55fb16f8f60

    transaction(
        playerAddress: Address,
        betAmount: UFix64,
        risk: String,
        rows: UInt8,
        finalPosition: UInt8,
        multiplier: UFix64
    ) {
        var gameResult: CasinoGames.GameResult?

        prepare(treasury: auth(BorrowValue) &Account) {
            log("🏦 Treasury-sponsored Plinko transaction")
            log("Player address: ".concat(playerAddress.toString()))
            log("Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
            log("Risk level: ".concat(risk))
            log("Rows: ".concat(rows.toString()))
            log("🎯 Frontend final position: ".concat(finalPosition.toString()))
            log("🎯 Frontend multiplier: ".concat(multiplier.toString()))
            log("Treasury address: ".concat(treasury.address.toString()))
            
            // Initialize gameResult to nil
            self.gameResult = nil
        }

        execute {
            self.gameResult = CasinoGames.playPlinkoWithResult(
                player: playerAddress,
                betAmount: betAmount,
                risk: risk,
                rows: rows,
                frontendPosition: finalPosition,
                frontendMultiplier: multiplier
            )
            
            log("✅ Treasury-sponsored Plinko game completed!")
            log("🎯 Frontend predicted position: ".concat(finalPosition.toString()))
            log("🎯 Frontend predicted multiplier: ".concat(multiplier.toString()))
            if let result = self.gameResult {
                log("🎰 Actual final position: ".concat(result.result["finalPosition"] ?? "unknown"))
                log("🎰 Actual multiplier: ".concat(result.result["multiplier"] ?? "unknown"))
                log("🔢 Random seed: ".concat(result.randomSeed.toString()))
                log("💎 Payout: ".concat(result.payout.toString()).concat(" FLOW"))
            }
        }

        post {
            self.gameResult != nil: "Game result must be set"
            self.gameResult!.gameType == "PLINKO": "Game type must be PLINKO"
            self.gameResult!.player == playerAddress: "Player address must match"
            self.gameResult!.betAmount == betAmount: "Bet amount must match"
        }
    }
  `
};

export async function POST(request) {
  try {
    const { gameType, playerAddress, gameParams } = await request.json();
    
    console.log('🏦 Treasury API: Processing game transaction', {
      gameType,
      playerAddress,
      gameParams
    });

    // Validate inputs
    if (!gameType || !playerAddress || !gameParams) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters: gameType, playerAddress, gameParams'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get transaction template
    const cadence = GAME_TRANSACTIONS[gameType.toLowerCase()];
    if (!cadence) {
      return new Response(JSON.stringify({
        error: `Unsupported game type: ${gameType}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build transaction arguments based on game type using FCL function format
    let args;
    if (gameType.toLowerCase() === 'roulette') {
      const betAmount = parseFloat(gameParams.betAmount || 0);
      args = (arg, t) => [
        arg(playerAddress, t.Address),
        arg(betAmount.toFixed(8), t.UFix64),
        arg(gameParams.betType || 'multiple', t.String),
        arg(gameParams.betNumbers || [], t.Array(t.UInt8))
      ];
    } else if (gameType.toLowerCase() === 'mines') {
      const betAmount = parseFloat(gameParams.betAmount || 0);
      args = (arg, t) => [
        arg(playerAddress, t.Address),
        arg(betAmount.toFixed(8), t.UFix64),
        arg((gameParams.mineCount || 3).toString(), t.UInt8),
        arg(gameParams.revealedTiles || [], t.Array(t.UInt8)),
        arg(gameParams.cashOut || false, t.Bool)
      ];
    } else if (gameType.toLowerCase() === 'plinko') {
      const betAmount = parseFloat(gameParams.betAmount || 0);
      const multiplier = parseFloat(gameParams.multiplier || 1.0);
      console.log('🎯 Plinko args debug:', {
        playerAddress,
        betAmount,
        risk: gameParams.risk || 'medium',
        rows: gameParams.rows || 16,
        finalPosition: gameParams.finalPosition || 0,
        multiplier
      });
      args = (arg, t) => [
        arg(playerAddress, t.Address),
        arg(betAmount.toFixed(8), t.UFix64),
        arg(gameParams.risk || 'medium', t.String),
        arg((gameParams.rows || 16).toString(), t.UInt8),
        arg((gameParams.finalPosition || 0).toString(), t.UInt8),
        arg(multiplier.toFixed(8), t.UFix64)
      ];
    } else if (gameType.toLowerCase() === 'wheel') {
      const betAmount = parseFloat(gameParams.betAmount || 0);
      const multiplier = parseFloat(gameParams.multiplier || 0);
      const wheelPosition = parseFloat(gameParams.wheelPosition || 0);
      args = (arg, t) => [
        arg(playerAddress, t.Address),
        arg(betAmount.toFixed(8), t.UFix64),
        arg((gameParams.segments || 10).toString(), t.UInt8),
        arg((gameParams.winningSegment || 0).toString(), t.UInt8),
        arg(multiplier.toFixed(8), t.UFix64),
        arg(wheelPosition.toFixed(8), t.UFix64),
        arg((gameParams.calculatedSegment || 0).toString(), t.UInt8)
      ];
    }

    // Execute transaction using FCL instead of Flow CLI
    console.log('🏦 Executing treasury transaction via FCL...');
    console.log('🔍 Game type:', gameType);
    console.log('🔍 Args type:', typeof args);
    console.log('🔍 Args function check:', typeof args === 'function');
    
    // Test if args function works by calling it directly
    if (typeof args === 'function') {
      console.log('🧪 Testing args function with mock parameters...');
      try {
        const mockArg = (value, type) => ({ value, type: type.toString() });
        const mockT = { Address: 'Address', UFix64: 'UFix64', String: 'String', UInt8: 'UInt8', Bool: 'Bool', Array: (t) => `Array(${t})` };
        const testResult = args(mockArg, mockT);
        console.log('🧪 Args function test result:', testResult);
      } catch (error) {
        console.error('🧪 Args function test failed:', error);
      }
    }
    
    // Create treasury authorization service
    const treasuryAuth = createTreasuryAuthService();
    
    // Execute transaction using FlowAuthService (same as working flow-withdraw)
    console.log('🚀 Executing Flow transaction via FlowAuthService...');
    const sealedTx = await treasuryAuth.executeTransaction(cadence, args, 1000);
    const transactionId = sealedTx.transactionId;

    console.log('✅ Treasury transaction sealed via FCL:', transactionId);

    // Parse transaction result
    const transaction = {
      id: transactionId,
      status: 'SEALED',
      events: sealedTx.events || [],
      blockId: sealedTx.blockId || 'unknown',
      timestamp: Date.now()
    };

    console.log('📊 Transaction details:', {
      id: transactionId,
      eventsCount: transaction.events.length,
      blockId: transaction.blockId
    });

    // Return transaction result
    return new Response(JSON.stringify({
      success: true,
      transactionId,
      transaction: {
        ...transaction,
        id: transactionId,
        treasurySponsored: true,
        executedViaFCL: true
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Treasury transaction API failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Treasury transaction failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
