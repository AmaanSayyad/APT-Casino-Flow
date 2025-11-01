import CasinoGames from 0x2083a55fb16f8f60

transaction(
    playerAddress: Address,
    betAmount: UFix64,
    risk: String,
    rows: UInt8,
    finalPosition: UInt8
) {
    var gameResult: CasinoGames.GameResult?

    prepare(treasury: auth(BorrowValue) &Account) {
        log("🏦 Treasury-sponsored Plinko transaction")
        log("Player address: ".concat(playerAddress.toString()))
        log("Bet amount: ".concat(betAmount.toString()).concat(" FLOW"))
        log("Risk level: ".concat(risk))
        log("Rows: ".concat(rows.toString()))
        log("Frontend final position: ".concat(finalPosition.toString()))
        log("Treasury address: ".concat(treasury.address.toString()))
        
        // Initialize gameResult to nil
        self.gameResult = nil
    }

    execute {
        self.gameResult = CasinoGames.playPlinkoWithPosition(
            player: playerAddress,
            betAmount: betAmount,
            risk: risk,
            rows: rows,
            frontendPosition: finalPosition
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