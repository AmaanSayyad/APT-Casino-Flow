/**
 * Casino Contract
 * Main casino contract that handles games and uses Flow VRF for randomness
 */

import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868
import FlowVRF from 0xFlowVRF

/// Game result resource
pub resource GameResult {
    pub let gameId: String
    pub let player: Address
    pub let gameType: String
    pub let betAmount: UFix64
    pub let winAmount: UFix64
    pub let randomValue: String
    pub let timestamp: UInt64
    pub let transactionId: String
    
    init(
        gameId: String,
        player: Address,
        gameType: String,
        betAmount: UFix64,
        winAmount: UFix64,
        randomValue: String,
        timestamp: UInt64,
        transactionId: String
    ) {
        self.gameId = gameId
        self.player = player
        self.gameType = gameType
        self.betAmount = betAmount
        self.winAmount = winAmount
        self.randomValue = randomValue
        self.timestamp = timestamp
        self.transactionId = transactionId
    }
}

/// Game session resource
pub resource GameSession {
    pub let sessionId: String
    pub let player: Address
    pub let startTime: UInt64
    pub let totalBet: UFix64
    pub let totalWin: UFix64
    pub let games: {String: GameResult}
    
    init(sessionId: String, player: Address) {
        self.sessionId = sessionId
        self.player = player
        self.startTime = getCurrentBlock().height
        self.totalBet = 0.0
        self.totalWin = 0.0
        self.games = {}
    }
    
    pub fun addGame(game: GameResult) {
        self.games[game.gameId] = game
        self.totalBet = self.totalBet + game.betAmount
        self.totalWin = self.totalWin + game.winAmount
    }
    
    pub fun getGame(gameId: String): GameResult? {
        return self.games[gameId]
    }
    
    pub fun getAllGames(): [GameResult] {
        return self.games.values
    }
}

/// Casino Manager resource
pub resource CasinoManager {
    pub let sessions: {String: GameSession}
    pub let treasury: &FlowToken.Vault
    pub let houseEdge: UFix64
    pub let minBet: UFix64
    pub let maxBet: UFix64
    
    init(treasury: &FlowToken.Vault) {
        self.sessions = {}
        self.treasury = treasury
        self.houseEdge = 0.02 // 2% house edge
        self.minBet = 0.001
        self.maxBet = 100.0
    }
    
    /// Create a new game session
    pub fun createSession(sessionId: String, player: Address): GameSession {
        pre {
            !self.sessions.containsKey(sessionId): "Session ID already exists"
        }
        
        let session = GameSession(sessionId: sessionId, player: player)
        self.sessions[sessionId] = session
        
        return session
    }
    
    /// Get game session
    pub fun getSession(sessionId: String): GameSession? {
        return self.sessions[sessionId]
    }
    
    /// Play a game
    pub fun playGame(
        sessionId: String,
        gameType: String,
        betAmount: UFix64,
        randomValue: String
    ): GameResult {
        pre {
            self.sessions.containsKey(sessionId): "Session does not exist"
            betAmount >= self.minBet: "Bet amount below minimum"
            betAmount <= self.maxBet: "Bet amount above maximum"
        }
        
        let session = self.sessions[sessionId]!
        let gameId = "game_".concat(sessionId).concat("_").concat(randomValue)
        
        // Calculate win amount based on game type and random value
        let winAmount = self.calculateWinAmount(
            gameType: gameType,
            betAmount: betAmount,
            randomValue: randomValue
        )
        
        // Create game result
        let gameResult = GameResult(
            gameId: gameId,
            player: session.player,
            gameType: gameType,
            betAmount: betAmount,
            winAmount: winAmount,
            randomValue: randomValue,
            timestamp: getCurrentBlock().height,
            transactionId: getCurrentBlock().id
        )
        
        // Add game to session
        session.addGame(gameResult)
        
        return gameResult
    }
    
    /// Calculate win amount based on game type
    access(contract) fun calculateWinAmount(
        gameType: String,
        betAmount: UFix64,
        randomValue: String
    ): UFix64 {
        // Convert random value to number (0-1)
        let randomNum = self.randomValueToNumber(randomValue: randomValue)
        
        switch gameType {
            case "MINES":
                return self.calculateMinesWin(betAmount: betAmount, randomValue: randomNum)
            case "PLINKO":
                return self.calculatePlinkoWin(betAmount: betAmount, randomValue: randomNum)
            case "ROULETTE":
                return self.calculateRouletteWin(betAmount: betAmount, randomValue: randomNum)
            case "WHEEL":
                return self.calculateWheelWin(betAmount: betAmount, randomValue: randomNum)
            default:
                return 0.0
        }
    }
    
    /// Convert random value to number between 0 and 1
    access(contract) fun randomValueToNumber(randomValue: String): UFix64 {
        // Use first 8 characters of hash for randomness
        let hash = sha3_256(randomValue.utf8)
        let hashStr = hash.toString()
        let numStr = hashStr.slice(0, 8)
        let num = UInt64.fromString(numStr) ?? 0
        return UFix64(num) / 0xFFFFFFFF
    }
    
    /// Calculate mines game win
    access(contract) fun calculateMinesWin(betAmount: UFix64, randomValue: UFix64): UFix64 {
        // Simplified mines logic - 50% chance to win 2x
        if randomValue > 0.5 {
            return betAmount * 2.0
        }
        return 0.0
    }
    
    /// Calculate plinko game win
    access(contract) fun calculatePlinkoWin(betAmount: UFix64, randomValue: UFix64): UFix64 {
        // Simplified plinko logic - various multipliers
        if randomValue > 0.95 {
            return betAmount * 100.0
        } else if randomValue > 0.8 {
            return betAmount * 10.0
        } else if randomValue > 0.5 {
            return betAmount * 2.0
        }
        return 0.0
    }
    
    /// Calculate roulette game win
    access(contract) fun calculateRouletteWin(betAmount: UFix64, randomValue: UFix64): UFix64 {
        // Simplified roulette logic - 1/37 chance to win 36x
        if randomValue > 0.973 { // 1/37 ≈ 0.027
            return betAmount * 36.0
        }
        return 0.0
    }
    
    /// Calculate wheel game win
    access(contract) fun calculateWheelWin(betAmount: UFix64, randomValue: UFix64): UFix64 {
        // Simplified wheel logic - various multipliers
        if randomValue > 0.99 {
            return betAmount * 1000.0
        } else if randomValue > 0.9 {
            return betAmount * 10.0
        } else if randomValue > 0.5 {
            return betAmount * 2.0
        }
        return 0.0
    }
    
    /// Process game payment
    pub fun processGamePayment(
        player: Address,
        betAmount: UFix64,
        winAmount: UFix64
    ) {
        // In a real implementation, this would handle the actual token transfers
        // For now, we just log the transaction
    }
}

/// Casino Contract
pub contract Casino {
    pub let CasinoManager: {String: CasinoManager}
    pub let VRF: &FlowVRF.VRFManager
    
    pub event GamePlayed(
        gameId: String,
        player: Address,
        gameType: String,
        betAmount: UFix64,
        winAmount: UFix64,
        randomValue: String
    )
    
    pub event SessionCreated(sessionId: String, player: Address)
    
    init() {
        self.CasinoManager = {}
        self.VRF = FlowVRF.VRFManager["default"]!
    }
    
    /// Create a new casino manager
    pub fun createCasinoManager(
        managerId: String,
        treasury: &FlowToken.Vault
    ) {
        pre {
            !self.CasinoManager.containsKey(managerId): "Manager ID already exists"
        }
        
        let manager = CasinoManager(treasury: treasury)
        self.CasinoManager[managerId] = manager
    }
    
    /// Create a new game session
    pub fun createSession(sessionId: String, player: Address): GameSession {
        let manager = self.CasinoManager["default"]!
        let session = manager.createSession(sessionId: sessionId, player: player)
        
        emit SessionCreated(sessionId: sessionId, player: player)
        
        return session
    }
    
    /// Play a game with VRF
    pub fun playGame(
        sessionId: String,
        gameType: String,
        betAmount: UFix64,
        vrfRequestId: String
    ): GameResult {
        // Get random value from VRF
        let randomValue = self.VRF.getRandomValue(requestId: vrfRequestId)
        pre {
            randomValue != nil: "VRF request not fulfilled"
        }
        
        let manager = self.CasinoManager["default"]!
        let gameResult = manager.playGame(
            sessionId: sessionId,
            gameType: gameType,
            betAmount: betAmount,
            randomValue: randomValue!
        )
        
        emit GamePlayed(
            gameId: gameResult.gameId,
            player: gameResult.player,
            gameType: gameResult.gameType,
            betAmount: gameResult.betAmount,
            winAmount: gameResult.winAmount,
            randomValue: gameResult.randomValue
        )
        
        return gameResult
    }
    
    /// Get game session
    pub fun getSession(sessionId: String): GameSession? {
        let manager = self.CasinoManager["default"]!
        return manager.getSession(sessionId: sessionId)
    }
    
    /// Get game result
    pub fun getGameResult(sessionId: String, gameId: String): GameResult? {
        let manager = self.CasinoManager["default"]!
        let session = manager.getSession(sessionId: sessionId)
        return session?.getGame(gameId: gameId)
    }
}
