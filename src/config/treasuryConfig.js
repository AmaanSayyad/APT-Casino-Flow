// Treasury Configuration for Flow Casino
export const TREASURY_CONFIG = {
  // Treasury account address on Flow Testnet
  address: '0x2083a55fb16f8f60',
  
  // Treasury-sponsored transaction templates
  transactions: {
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
              log("🎯 Winning number: ".concat(self.gameResult.result["winningNumber"] ?? "unknown"))
              log("💎 Payout: ".concat(self.gameResult.payout.toString()).concat(" FLOW"))
          }
          
          post {
              self.gameResult.gameType == "ROULETTE": "Game type must be ROULETTE"
              self.gameResult.player == playerAddress: "Player address must match"
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
              log("💣 Hit mine: ".concat(self.gameResult.result["hitMine"] ?? "false"))
              log("💎 Payout: ".concat(self.gameResult.payout.toString()).concat(" FLOW"))
          }
          
          post {
              self.gameResult.gameType == "MINES": "Game type must be MINES"
              self.gameResult.player == playerAddress: "Player address must match"
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
              log("🏦 Treasury sponsoring plinko game for player: ".concat(playerAddress.toString()))
              log("💰 Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
              log("⚡ Risk level: ".concat(risk))
          }
          
          execute {
              self.gameResult = CasinoGames.playPlinko(
                  player: playerAddress,
                  betAmount: betAmount,
                  risk: risk,
                  rows: rows
              )
              
              log("✅ Treasury-sponsored plinko game completed!")
              log("🎯 Final position: ".concat(self.gameResult.result["finalPosition"] ?? "0"))
              log("💎 Payout: ".concat(self.gameResult.payout.toString()).concat(" FLOW"))
          }
          
          post {
              self.gameResult.gameType == "PLINKO": "Game type must be PLINKO"
              self.gameResult.player == playerAddress: "Player address must match"
          }
      }
    `,
    
    wheel: `
      import CasinoGames from 0x2083a55fb16f8f60

      transaction(
          playerAddress: Address,
          betAmount: UFix64,
          segments: UInt8
      ) {
          
          var gameResult: CasinoGames.GameResult?
          
          prepare(treasury: auth(BorrowValue) &Account) {
              log("🏦 Treasury sponsoring wheel game for player: ".concat(playerAddress.toString()))
              log("💰 Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
              log("🎡 Segments: ".concat(segments.toString()))
          }
          
          execute {
              self.gameResult = CasinoGames.playWheel(
                  player: playerAddress,
                  betAmount: betAmount,
                  segments: segments
              )
              
              log("✅ Treasury-sponsored wheel game completed!")
              log("🎯 Winning segment: ".concat(self.gameResult.result["winningSegment"] ?? "0"))
              log("💎 Payout: ".concat(self.gameResult.payout.toString()).concat(" FLOW"))
          }
          
          post {
              self.gameResult.gameType == "WHEEL": "Game type must be WHEEL"
              self.gameResult.player == playerAddress: "Player address must match"
          }
      }
    `
  }
};

// Helper function to get treasury transaction code for a specific game
export const getTreasuryTransactionCode = (gameType) => {
  return TREASURY_CONFIG.transactions[gameType.toLowerCase()] || null;
};

// Treasury transaction argument builders
export const buildRouletteArgs = (playerAddress, betAmount, betType, betNumbers = []) => {
  return (arg, t) => [
    arg(playerAddress, t.Address),
    arg(betAmount.toFixed(8), t.UFix64),
    arg(betType, t.String),
    arg(betNumbers, t.Array(t.UInt8))
  ];
};

export const buildMinesArgs = (playerAddress, betAmount, mineCount, revealedTiles, cashOut) => {
  return (arg, t) => [
    arg(playerAddress, t.Address),
    arg(betAmount.toFixed(8), t.UFix64),
    arg(mineCount, t.UInt8),
    arg(revealedTiles, t.Array(t.UInt8)),
    arg(cashOut, t.Bool)
  ];
};

export const buildPlinkoArgs = (playerAddress, betAmount, risk, rows) => {
  return (arg, t) => [
    arg(playerAddress, t.Address),
    arg(betAmount.toFixed(8), t.UFix64),
    arg(risk, t.String),
    arg(rows, t.UInt8)
  ];
};

export const buildWheelArgs = (playerAddress, betAmount, segments) => {
  return (arg, t) => [
    arg(playerAddress, t.Address),
    arg(betAmount.toFixed(8), t.UFix64),
    arg(segments, t.UInt8)
  ];
};
