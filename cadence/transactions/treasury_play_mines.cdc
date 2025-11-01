import CasinoGames from 0x2083a55fb16f8f60

// Treasury-sponsored transaction for mines game
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
        log("🎲 Treasury address: ".concat(treasury.address.toString()))
        
        // Initialize gameResult to nil
        self.gameResult = nil
    }
    
    execute {
        // Play the mines game with treasury as transaction sponsor
        self.gameResult = CasinoGames.playMines(
            player: playerAddress,
            betAmount: betAmount,
            mineCount: mineCount,
            revealedTiles: revealedTiles,
            cashOut: cashOut
        )
        
        log("✅ Treasury-sponsored mines game completed!")
        if let result = self.gameResult {
            log("💣 Hit mine: ".concat(result.result["hitMine"] ?? "false"))
            log("🔢 Random seed: ".concat(result.randomSeed.toString()))
            log("💎 Payout: ".concat(result.payout.toString()).concat(" FLOW"))
        }
    }
    
    post {
        self.gameResult != nil: "Game result must be set"
        self.gameResult!.gameType == "MINES": "Game type must be MINES"
        self.gameResult!.player == playerAddress: "Player address must match"
        self.gameResult!.betAmount == betAmount: "Bet amount must match"
    }
}
