import CasinoGames from "../contracts/CasinoGames.cdc"

transaction(
    betAmount: UFix64,
    segments: UInt8
) {
    
    let gameResult: CasinoGames.GameResult
    
    prepare(player: &Account) {
        log("Playing Wheel with bet amount: ".concat(betAmount.toString()))
        log("Segments: ".concat(segments.toString()))
        log("Player address: ".concat(player.address.toString()))
    }
    
    execute {
        // Play the wheel game - only for random number generation
        self.gameResult = CasinoGames.playWheel(
            player: self.account.address,
            betAmount: betAmount,
            segments: segments
        )
        
        log("Wheel game completed!")
        log("Winning segment: ".concat(self.gameResult.result["winningSegment"] ?? "unknown"))
        log("Random seed: ".concat(self.gameResult.randomSeed.toString()))
    }
    
    post {
        self.gameResult.gameType == "WHEEL": "Game type must be WHEEL"
        self.gameResult.player == self.account.address: "Player address must match"
    }
}