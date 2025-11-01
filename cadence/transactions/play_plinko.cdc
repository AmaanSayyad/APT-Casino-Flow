import CasinoGames from "../contracts/CasinoGames.cdc"

transaction(
    betAmount: UFix64,
    risk: String,
    rows: UInt8
) {
    
    let gameResult: CasinoGames.GameResult
    
    prepare(player: &Account) {
        log("Playing Plinko with bet amount: ".concat(betAmount.toString()))
        log("Risk: ".concat(risk))
        log("Rows: ".concat(rows.toString()))
        log("Player address: ".concat(player.address.toString()))
    }
    
    execute {
        // Play the plinko game - only for random number generation
        self.gameResult = CasinoGames.playPlinko(
            player: self.account.address,
            betAmount: betAmount,
            risk: risk,
            rows: rows
        )
        
        log("Plinko game completed!")
        log("Final position: ".concat(self.gameResult.result["finalPosition"] ?? "unknown"))
        log("Random seed: ".concat(self.gameResult.randomSeed.toString()))
    }
    
    post {
        self.gameResult.gameType == "PLINKO": "Game type must be PLINKO"
        self.gameResult.player == self.account.address: "Player address must match"
    }
}