import CasinoGames from "../contracts/CasinoGames.cdc"

transaction(
    betAmount: UFix64,
    mineCount: UInt8,
    revealedTiles: [UInt8],
    cashOut: Bool
) {
    
    let gameResult: CasinoGames.GameResult
    
    prepare(player: &Account) {
        log("Playing Mines with bet amount: ".concat(betAmount.toString()))
        log("Mine count: ".concat(mineCount.toString()))
        log("Revealed tiles: ".concat(revealedTiles.length.toString()))
        log("Cash out: ".concat(cashOut.toString()))
        log("Player address: ".concat(player.address.toString()))
    }
    
    execute {
        // Play the mines game - only for random number generation
        self.gameResult = CasinoGames.playMines(
            player: self.account.address,
            betAmount: betAmount,
            mineCount: mineCount,
            revealedTiles: revealedTiles,
            cashOut: cashOut
        )
        
        log("Mines game completed!")
        log("Mine positions: ".concat(self.gameResult.result["minePositions"] ?? "unknown"))
        log("Random seed: ".concat(self.gameResult.randomSeed.toString()))
    }
    
    post {
        self.gameResult.gameType == "MINES": "Game type must be MINES"
        self.gameResult.player == self.account.address: "Player address must match"
    }
}