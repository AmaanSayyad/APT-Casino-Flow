import CasinoGames from 0x2083a55fb16f8f60

// Treasury-sponsored transaction for wheel game
transaction(
    playerAddress: Address,
    betAmount: UFix64,
    segments: UInt8
) {
    
    var gameResult: CasinoGames.GameResult?
    
    prepare(treasury: auth(BorrowValue) &Account) {
        log("🏦 Treasury sponsoring wheel game for player: ".concat(playerAddress.toString()))
        log("💰 Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
        log("🎰 Segments: ".concat(segments.toString()))
        log("🎲 Treasury address: ".concat(treasury.address.toString()))
        
        // Initialize gameResult to nil
        self.gameResult = nil
    }
    
    execute {
        // Play the wheel game with treasury as transaction sponsor
        self.gameResult = CasinoGames.playWheel(
            player: playerAddress,
            betAmount: betAmount,
            segments: segments
        )
        
        log("✅ Treasury-sponsored wheel game completed!")
        if let result = self.gameResult {
            log("🎰 Winning segment: ".concat(result.result["winningSegment"] ?? "unknown"))
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