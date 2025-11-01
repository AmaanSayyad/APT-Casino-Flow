import CasinoGames from 0x2083a55fb16f8f60

// Treasury-sponsored transaction for roulette game
// Treasury pays the transaction fee, player just provides the game parameters
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
        log("🎲 Treasury address: ".concat(treasury.address.toString()))
        
        // Initialize gameResult as nil
        self.gameResult = nil
    }
    
    execute {
        // Play the roulette game with treasury as transaction sponsor
        self.gameResult = CasinoGames.playRoulette(
            player: playerAddress,  // Player's address for game logic
            betAmount: betAmount,
            betType: betType,
            betNumbers: betNumbers
        )
        
        log("✅ Treasury-sponsored roulette game completed!")
        if let result = self.gameResult {
            log("🎯 Winning number: ".concat(result.result["winningNumber"] ?? "unknown"))
            log("🔢 Random seed: ".concat(result.randomSeed.toString()))
            log("💎 Payout: ".concat(result.payout.toString()).concat(" FLOW"))
        }
    }
    
    post {
        self.gameResult != nil: "Game result must be set"
        self.gameResult!.gameType == "ROULETTE": "Game type must be ROULETTE"
        self.gameResult!.player == playerAddress: "Player address must match"
        self.gameResult!.betAmount == betAmount: "Bet amount must match"
    }
}
