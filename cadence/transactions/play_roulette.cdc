import CasinoGames from "../contracts/CasinoGames.cdc"

transaction(
    betAmount: UFix64,
    betType: String,
    betNumbers: [UInt8]
) {
    
    let gameResult: CasinoGames.GameResult
    
    prepare(player: &Account) {
        log("Playing Roulette with bet amount: ".concat(betAmount.toString()))
        log("Bet type: ".concat(betType))
        log("Player address: ".concat(player.address.toString()))
    }
    
    execute {
        // Play the roulette game - only for random number generation
        self.gameResult = CasinoGames.playRoulette(
            player: self.account.address,
            betAmount: betAmount,
            betType: betType,
            betNumbers: betNumbers
        )
        
        log("Roulette game completed!")
        log("Winning number: ".concat(self.gameResult.result["winningNumber"] ?? "unknown"))
        log("Random seed: ".concat(self.gameResult.randomSeed.toString()))
    }
    
    post {
        self.gameResult.gameType == "ROULETTE": "Game type must be ROULETTE"
        self.gameResult.player == self.account.address: "Player address must match"
    }
}