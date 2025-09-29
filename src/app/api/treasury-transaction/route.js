// Treasury Transaction API Endpoint
// Handles treasury-sponsored transactions server-side to avoid user wallet interaction

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

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
  
  plinko: `
    import CasinoGames from 0x2083a55fb16f8f60

    transaction(
        playerAddress: Address,
        betAmount: UFix64,
        risk: String,
        rows: UInt8
    ) {
        var gameResult: CasinoGames.GameResult?

        prepare(treasury: auth(BorrowValue) &Account) {
            log("🏦 Treasury-sponsored Plinko transaction")
            log("Player address: ".concat(playerAddress.toString()))
            log("Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
            log("Risk level: ".concat(risk))
            log("Rows: ".concat(rows.toString()))
            log("Treasury address: ".concat(treasury.address.toString()))
            
            // Initialize gameResult to nil
            self.gameResult = nil
        }

        execute {
            self.gameResult = CasinoGames.playPlinko(
                player: playerAddress,
                betAmount: betAmount,
                risk: risk,
                rows: rows
            )
            
            log("✅ Treasury-sponsored Plinko game completed!")
            if let result = self.gameResult {
                log("🎯 Final position: ".concat(result.result["finalPosition"] ?? "unknown"))
                log("📊 Multiplier: ".concat(result.result["multiplier"] ?? "1.0"))
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

    // Build transaction arguments based on game type
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
        arg(gameParams.mineCount || 3, t.UInt8),
        arg(gameParams.revealedTiles || [], t.Array(t.UInt8)),
        arg(gameParams.cashOut || false, t.Bool)
      ];
    }

    // Create temporary transaction file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Remove temporary file creation since we're using existing files

    // Build Flow CLI command arguments - simplified format
    let flowArgs = '';
    if (gameType.toLowerCase() === 'roulette') {
      const betAmount = parseFloat(gameParams.betAmount || 0);
      flowArgs = `${playerAddress} ${betAmount.toFixed(8)} "${gameParams.betType || 'multiple'}" "[]"`;
    } else if (gameType.toLowerCase() === 'mines') {
      const betAmount = parseFloat(gameParams.betAmount || 0);
      const revealedTilesStr = gameParams.revealedTiles ? `[${gameParams.revealedTiles.join(',')}]` : '[]';
      flowArgs = `${playerAddress} ${betAmount.toFixed(8)} ${gameParams.mineCount || 3} "${revealedTilesStr}" ${gameParams.cashOut || false}`;
    } else if (gameType.toLowerCase() === 'plinko') {
      const betAmount = parseFloat(gameParams.betAmount || 0);
      const finalPosition = gameParams.finalPosition || 0; // Frontend-calculated position
      flowArgs = `${playerAddress} ${betAmount.toFixed(8)} "${gameParams.risk || 'medium'}" ${gameParams.rows || 16} ${finalPosition}`;
    }

    // Use existing treasury transaction file instead of creating new one
    const existingTransactionFile = path.join(process.cwd(), 'cadence', 'transactions', `treasury_play_${gameType.toLowerCase()}.cdc`);
    
    if (!fs.existsSync(existingTransactionFile)) {
      throw new Error(`Treasury transaction file not found: ${existingTransactionFile}`);
    }

    // Execute transaction using Flow CLI
    console.log('🏦 Executing treasury transaction via Flow CLI...');
    
    const flowCommand = `flow transactions send ${existingTransactionFile} ${flowArgs} --network testnet --signer treasury`;
    console.log('📝 Flow command:', flowCommand);
    
    const { stdout, stderr } = await execAsync(flowCommand, {
      cwd: process.cwd()
    });

    if (stderr && !stderr.includes('Transaction ID:')) {
      throw new Error(`Flow CLI error: ${stderr}`);
    }

    // Extract transaction ID from output
    const transactionIdMatch = stdout.match(/Transaction ID: ([a-f0-9]+)/);
    const transactionId = transactionIdMatch ? transactionIdMatch[1] : null;

    if (!transactionId) {
      throw new Error('Could not extract transaction ID from Flow CLI output');
    }

    console.log('✅ Treasury transaction submitted:', transactionId);

    // Wait for transaction to be sealed and get events using Flow CLI
    const sealCommand = `flow transactions get ${transactionId} --network testnet --sealed`;
    const { stdout: sealOutput } = await execAsync(sealCommand, {
      cwd: process.cwd()
    });

    console.log('📊 Transaction details:', sealOutput);

    // Parse events from Flow CLI output
    let events = [];
    let blockId = 'unknown';
    
    try {
      // Extract events from CLI output
      const eventMatches = sealOutput.match(/Events:\s*(.*?)(?:\n\n|\nCode|$)/s);
      if (eventMatches) {
        const eventsSection = eventMatches[1];
        
        // Look for GamePlayed event
        const gamePlayedMatch = eventsSection.match(/Type\s+A\.2083a55fb16f8f60\.CasinoGames\.GamePlayed[\s\S]*?Values\s*([\s\S]*?)(?=\n\n|\nCode|$)/);
        if (gamePlayedMatch) {
          const valuesSection = gamePlayedMatch[1];
          
          // Parse game result values - updated regex for Flow CLI format
          const gameResultMatch = valuesSection.match(/- gameResult \(\{String:String\}\): (.+)/);
          if (gameResultMatch) {
            try {
              // Parse the game result JSON string
              const gameResultStr = gameResultMatch[1].trim();
              console.log('🔍 Raw game result string:', gameResultStr);
              
              const gameResultData = JSON.parse(gameResultStr);
              console.log('✅ Parsed game result data:', gameResultData);
              
              events.push({
                type: 'A.2083a55fb16f8f60.CasinoGames.GamePlayed',
                data: {
                  gameResult: gameResultData
                }
              });
            } catch (parseError) {
              console.warn('Failed to parse game result:', parseError);
              console.warn('Raw string was:', gameResultMatch[1]);
            }
          } else {
            console.warn('Could not find gameResult in values section:', valuesSection);
          }
        }
      }

      // Extract block ID
      const blockIdMatch = sealOutput.match(/Block ID\s+([a-f0-9]+)/);
      if (blockIdMatch) {
        blockId = blockIdMatch[1];
      }
    } catch (parseError) {
      console.warn('Failed to parse transaction details:', parseError);
    }

    // No temporary file to clean up since we're using existing files

    // Parse transaction result
    const transaction = {
      id: transactionId,
      status: 'SEALED',
      events: events,
      blockId: blockId,
      timestamp: Date.now()
    };

    console.log('✅ Treasury transaction sealed:', transaction);

    // Return transaction result
    return new Response(JSON.stringify({
      success: true,
      transactionId,
      transaction: {
        ...transaction,
        id: transactionId,
        treasurySponsored: true
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
