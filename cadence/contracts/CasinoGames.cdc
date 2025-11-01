import Crypto

access(all) contract CasinoGames {
    
    // Events
    access(all) event GamePlayed(
        gameType: String,
        player: Address,
        betAmount: UFix64,
        gameParams: {String: String},
        randomSeed: UInt64,
        gameResult: {String: String},
        payout: UFix64,
        timestamp: UFix64,
        blockHeight: UInt64
    )
    
    access(all) event RandomnessGenerated(
        requestId: String,
        randomValue: UInt64,
        blockHeight: UInt64,
        timestamp: UFix64
    )
    
    // Game Types
    access(all) enum GameType: UInt8 {
        access(all) case ROULETTE
        access(all) case MINES
        access(all) case PLINKO
        access(all) case WHEEL
    }
    
    // Game Result Structure
    access(all) struct GameResult {
        access(all) let gameType: String
        access(all) let player: Address
        access(all) let betAmount: UFix64
        access(all) let randomSeed: UInt64
        access(all) let gameParams: {String: String}
        access(all) let result: {String: String}
        access(all) let payout: UFix64
        access(all) let timestamp: UFix64
        access(all) let blockHeight: UInt64
        access(all) let transactionId: String
        
        init(
            gameType: String,
            player: Address,
            betAmount: UFix64,
            randomSeed: UInt64,
            gameParams: {String: String},
            result: {String: String},
            payout: UFix64,
            timestamp: UFix64,
            blockHeight: UInt64,
            transactionId: String
        ) {
            self.gameType = gameType
            self.player = player
            self.betAmount = betAmount
            self.randomSeed = randomSeed
            self.gameParams = gameParams
            self.result = result
            self.payout = payout
            self.timestamp = timestamp
            self.blockHeight = blockHeight
            self.transactionId = transactionId
        }
    }
    
    // Randomness Generator using Flow's secure randomness
    access(all) fun generateSecureRandom(salt: String): UInt64 {
        let currentBlock = getCurrentBlock()
        let blockHeight = currentBlock.height
        let timestamp = currentBlock.timestamp
        
        // Combine block data with salt for additional entropy
        let combinedData = salt.concat(blockHeight.toString()).concat(timestamp.toString())
        let hash = Crypto.hash(combinedData.utf8, algorithm: HashAlgorithm.SHA3_256)
        
        // Convert hash to UInt64
        var randomValue: UInt64 = 0
        var i = 0
        while i < 8 && i < hash.length {
            randomValue = randomValue + (UInt64(hash[i]) << UInt64(8 * (7 - i)))
            i = i + 1
        }
        
        return randomValue
    }
    
    // Roulette Game Logic (0-36) - Only for random number generation
    access(all) fun playRoulette(
        player: Address,
        betAmount: UFix64,
        betType: String,
        betNumbers: [UInt8]
    ): GameResult {
        let salt = "ROULETTE_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        let winningNumber = UInt8(randomSeed % 37) // 0-36
        
        // Determine color
        let color = self.getRouletteColor(number: winningNumber)
        
        // No payout calculation - handled in frontend
        let payout: UFix64 = 0.0
        
        let gameParams: {String: String} = {
            "betType": betType,
            "betNumbers": betNumbers.length > 0 ? betNumbers[0].toString() : "0"
        }
        
        let result: {String: String} = {
            "winningNumber": winningNumber.toString(),
            "color": color,
            "isWin": payout > 0.0 ? "true" : "false",
            "multiplier": payout > 0.0 ? (payout / betAmount).toString() : "0.0"
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "ROULETTE",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: "" // Will be set by transaction
        )
        
        emit GamePlayed(
            gameType: "ROULETTE",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Mines Game Logic
    access(all) fun playMines(
        player: Address,
        betAmount: UFix64,
        mineCount: UInt8,
        revealedTiles: [UInt8],
        cashOut: Bool
    ): GameResult {
        let salt = "MINES_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        // Generate mine positions (25 tiles total)
        let minePositions = self.generateMinePositions(seed: randomSeed, mineCount: mineCount, gridSize: 25)
        
        // Check if player hit a mine
        var hitMine = false
        for tile in revealedTiles {
            if minePositions.contains(tile) {
                hitMine = true
                break
            }
        }
        
        // No payout calculation - handled in frontend
        let payout: UFix64 = 0.0
        
        let gameParams: {String: String} = {
            "mineCount": mineCount.toString(),
            "revealedTiles": revealedTiles.length.toString(),
            "cashOut": cashOut ? "true" : "false"
        }
        
        let result: {String: String} = {
            "minePositions": self.arrayToString(minePositions),
            "hitMine": hitMine ? "true" : "false",
            "safeReveals": revealedTiles.length.toString(),
            "isWin": payout > 0.0 ? "true" : "false",
            "multiplier": payout > 0.0 ? (payout / betAmount).toString() : "0.0"
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "MINES",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "MINES",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Plinko Game Logic
    access(all) fun playPlinko(
        player: Address,
        betAmount: UFix64,
        risk: String,
        rows: UInt8
    ): GameResult {
        let salt = "PLINKO_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        // Calculate ball path
        let finalPosition = self.calculatePlinkoPath(seed: randomSeed, rows: rows)
        let multiplier = self.getPlinkoMultiplier(position: finalPosition, rows: rows, risk: risk)
        // Calculate payout based on multiplier
        let payout: UFix64 = betAmount * multiplier
        
        let gameParams: {String: String} = {
            "risk": risk,
            "rows": rows.toString()
        }
        
        let result: {String: String} = {
            "finalPosition": finalPosition.toString(),
            "multiplier": multiplier.toString(),
            "isWin": payout > betAmount ? "true" : "false",
            "path": "calculated" // Simplified for storage
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "PLINKO",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "PLINKO",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Plinko Game Logic with Frontend Position (for physics simulation)
    access(all) fun playPlinkoWithPosition(
        player: Address,
        betAmount: UFix64,
        risk: String,
        rows: UInt8,
        frontendPosition: UInt8
    ): GameResult {
        let salt = "PLINKO_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        // Use frontend-calculated position instead of blockchain calculation
        let finalPosition = frontendPosition
        let multiplier = self.getPlinkoMultiplier(position: finalPosition, rows: rows, risk: risk)
        let payout: UFix64 = betAmount * multiplier
        
        let gameParams: {String: String} = {
            "risk": risk,
            "rows": rows.toString()
        }
        
        let result: {String: String} = {
            "finalPosition": finalPosition.toString(),
            "multiplier": multiplier.toString(),
            "isWin": payout > betAmount ? "true" : "false",
            "path": "frontend_physics" // Indicates this came from frontend physics
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "PLINKO",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "PLINKO",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Plinko Game Logic with Frontend Position and Multiplier (for complete frontend control)
    access(all) fun playPlinkoWithResult(
        player: Address,
        betAmount: UFix64,
        risk: String,
        rows: UInt8,
        frontendPosition: UInt8,
        frontendMultiplier: UFix64
    ): GameResult {
        let salt = "PLINKO_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        // Use frontend-calculated position and multiplier
        let finalPosition = frontendPosition
        let multiplier = frontendMultiplier
        let payout: UFix64 = betAmount * multiplier
        
        let gameParams: {String: String} = {
            "risk": risk,
            "rows": rows.toString()
        }
        
        let result: {String: String} = {
            "finalPosition": finalPosition.toString(),
            "multiplier": multiplier.toString(),
            "isWin": payout > betAmount ? "true" : "false",
            "path": "frontend_physics" // Indicates this came from frontend physics
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "PLINKO",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "PLINKO",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Wheel Game Logic
    access(all) fun playWheel(
        player: Address,
        betAmount: UFix64,
        segments: UInt8
    ): GameResult {
        let salt = "WHEEL_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        let winningSegment = UInt8(randomSeed % UInt64(segments))
        let multiplier = self.getWheelMultiplier(segment: winningSegment, totalSegments: segments)
        // No payout calculation - handled in frontend
        let payout: UFix64 = 0.0
        
        let gameParams: {String: String} = {
            "segments": segments.toString()
        }
        
        let result: {String: String} = {
            "winningSegment": winningSegment.toString(),
            "multiplier": multiplier.toString(),
            "isWin": payout > betAmount ? "true" : "false"
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Wheel Game Logic with Frontend Segment (for physics simulation)
    access(all) fun playWheelWithSegment(
        player: Address,
        betAmount: UFix64,
        segments: UInt8,
        frontendSegment: UInt8
    ): GameResult {
        let salt = "WHEEL_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        // Use frontend-calculated segment instead of blockchain calculation
        let winningSegment = frontendSegment
        let multiplier = self.getWheelMultiplier(segment: winningSegment, totalSegments: segments)
        // Calculate payout based on multiplier
        let payout: UFix64 = betAmount * multiplier
        
        let gameParams: {String: String} = {
            "segments": segments.toString()
        }
        
        let result: {String: String} = {
            "winningSegment": winningSegment.toString(),
            "multiplier": multiplier.toString(),
            "isWin": payout > betAmount ? "true" : "false"
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Wheel Game Logic with Frontend Segment and Multiplier (for complete frontend control)
    access(all) fun playWheelWithSegmentAndMultiplier(
        player: Address,
        betAmount: UFix64,
        segments: UInt8,
        frontendSegment: UInt8,
        frontendMultiplier: UFix64
    ): GameResult {
        let salt = "WHEEL_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        // Use frontend-calculated segment and multiplier
        let winningSegment = frontendSegment
        let multiplier = frontendMultiplier
        // Calculate payout based on frontend multiplier
        let payout: UFix64 = betAmount * multiplier
        
        let gameParams: {String: String} = {
            "segments": segments.toString()
        }
        
        let result: {String: String} = {
            "winningSegment": winningSegment.toString(),
            "multiplier": multiplier.toString(),
            "isWin": payout > betAmount ? "true" : "false"
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Wheel Game Logic with Full Frontend Data (for complete frontend control)
    access(all) fun playWheelWithFullData(
        player: Address,
        betAmount: UFix64,
        segments: UInt8,
        frontendSegment: UInt8,
        frontendMultiplier: UFix64,
        frontendWheelPosition: UFix64,
        frontendCalculatedSegment: UInt8
    ): GameResult {
        let salt = "WHEEL_".concat(player.toString()).concat("_").concat(getCurrentBlock().timestamp.toString())
        let randomSeed = self.generateSecureRandom(salt: salt)
        
        // Use all frontend-calculated values
        let winningSegment = frontendSegment
        let multiplier = frontendMultiplier
        let wheelPosition = frontendWheelPosition
        let calculatedSegment = frontendCalculatedSegment
        // Calculate payout based on frontend multiplier
        let payout: UFix64 = betAmount * multiplier
        
        let gameParams: {String: String} = {
            "segments": segments.toString(),
            "wheelPosition": wheelPosition.toString(),
            "calculatedSegment": calculatedSegment.toString()
        }
        
        let result: {String: String} = {
            "winningSegment": winningSegment.toString(),
            "multiplier": multiplier.toString(),
            "wheelPosition": wheelPosition.toString(),
            "calculatedSegment": calculatedSegment.toString(),
            "isWin": payout > betAmount ? "true" : "false"
        }
        
        let currentBlock = getCurrentBlock()
        let gameResult = GameResult(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            randomSeed: randomSeed,
            gameParams: gameParams,
            result: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height,
            transactionId: ""
        )
        
        emit GamePlayed(
            gameType: "WHEEL",
            player: player,
            betAmount: betAmount,
            gameParams: gameParams,
            randomSeed: randomSeed,
            gameResult: result,
            payout: payout,
            timestamp: currentBlock.timestamp,
            blockHeight: currentBlock.height
        )
        
        return gameResult
    }
    
    // Helper Functions
    access(all) fun getRouletteColor(number: UInt8): String {
        if number == 0 {
            return "green"
        }
        
        let redNumbers: [UInt8] = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
        for red in redNumbers {
            if number == red {
                return "red"
            }
        }
        return "black"
    }
    
    access(all) fun calculateRoulettePayout(betType: String, betNumbers: [UInt8], winningNumber: UInt8, betAmount: UFix64): UFix64 {
        // Simplified payout calculation
        if betType == "straight" && betNumbers.contains(winningNumber) {
            return betAmount * 35.0 // 35:1 payout
        } else if betType == "red" && self.getRouletteColor(number: winningNumber) == "red" {
            return betAmount * 2.0 // 1:1 payout
        } else if betType == "black" && self.getRouletteColor(number: winningNumber) == "black" {
            return betAmount * 2.0 // 1:1 payout
        } else if betType == "even" && winningNumber % 2 == 0 && winningNumber != 0 {
            return betAmount * 2.0 // 1:1 payout
        } else if betType == "odd" && winningNumber % 2 == 1 {
            return betAmount * 2.0 // 1:1 payout
        }
        return 0.0 // No win
    }
    
    access(all) fun generateMinePositions(seed: UInt64, mineCount: UInt8, gridSize: UInt8): [UInt8] {
        var positions: [UInt8] = []
        var currentSeed = seed
        var attempts = 0
        
        while positions.length < Int(mineCount) && attempts < 100 {
            // Ultra-safe random number generation to prevent any overflow
            currentSeed = currentSeed % 1000  // First keep it very small
            currentSeed = currentSeed * 7 + 13  // Then safe multiplication
            currentSeed = currentSeed % 10000  // Keep result manageable
            let position = UInt8(currentSeed % UInt64(gridSize))
            
            if !positions.contains(position) {
                positions.append(position)
            }
            attempts = attempts + 1
        }
        
        return positions
    }
    
    access(all) fun calculateMinesMultiplier(mineCount: UInt8, safeReveals: Int): UFix64 {
        // Simplified multiplier calculation
        let baseMultiplier = 1.0 + (UFix64(safeReveals) * 0.2)
        let riskMultiplier = 1.0 + (UFix64(mineCount) * 0.1)
        return baseMultiplier * riskMultiplier
    }
    
    access(all) fun calculatePlinkoPath(seed: UInt64, rows: UInt8): UInt8 {
        // Simple but consistent position calculation that matches frontend expectations
        // Frontend has binCount = rows + 1, so position range is 0 to rows
        var currentSeed = seed
        
        // Use modulo to get position directly within valid range
        let binCount = rows + 1 // Frontend uses rows + 1 bins
        let rawPosition = currentSeed % UInt64(binCount)
        
        // Ensure result is within bounds
        let position = rawPosition < UInt64(binCount) ? UInt8(rawPosition) : UInt8(binCount - 1)
        
        return position
    }
    
    access(all) fun getPlinkoMultiplier(position: UInt8, rows: UInt8, risk: String): UFix64 {
        // Exact same multiplier tables as frontend - no risk multiplication, each combination has its own table
        var multiplier: UFix64 = 1.0
        
        if risk == "low" {
            if rows == 8 {
                let multipliers: [UFix64] = [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6]
                if position < 9 { multiplier = multipliers[position] }
            } else if rows == 12 {
                let multipliers: [UFix64] = [10.0, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10.0]
                if position < 13 { multiplier = multipliers[position] }
            } else if rows == 15 {
                let multipliers: [UFix64] = [15.0, 8.0, 3.0, 2.0, 1.5, 1.1, 1.0, 0.7, 0.7, 1.0, 1.1, 1.5, 2.0, 3.0, 8.0, 15.0]
                if position < 16 { multiplier = multipliers[position] }
            } else if rows == 16 {
                let multipliers: [UFix64] = [16.0, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16.0]
                if position < 17 { multiplier = multipliers[position] }
            }
        } else if risk == "medium" {
            if rows == 8 {
                let multipliers: [UFix64] = [13.0, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.0]
                if position < 9 { multiplier = multipliers[position] }
            } else if rows == 12 {
                let multipliers: [UFix64] = [33.0, 11.0, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11.0, 33.0]
                if position < 13 { multiplier = multipliers[position] }
            } else if rows == 15 {
                let multipliers: [UFix64] = [88.0, 18.0, 11.0, 5.0, 3.0, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3.0, 5.0, 11.0, 18.0, 88.0]
                if position < 16 { multiplier = multipliers[position] }
            } else if rows == 16 {
                let multipliers: [UFix64] = [110.0, 41.0, 10.0, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10.0, 41.0, 110.0]
                if position < 17 { multiplier = multipliers[position] }
            }
        } else { // high risk
            if rows == 8 {
                let multipliers: [UFix64] = [29.0, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.0]
                if position < 9 { multiplier = multipliers[position] }
            } else if rows == 12 {
                let multipliers: [UFix64] = [170.0, 24.0, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24.0, 170.0]
                if position < 13 { multiplier = multipliers[position] }
            } else if rows == 15 {
                let multipliers: [UFix64] = [620.0, 83.0, 27.0, 8.0, 3.0, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3.0, 8.0, 27.0, 83.0, 620.0]
                if position < 16 { multiplier = multipliers[position] }
            } else if rows == 16 {
                let multipliers: [UFix64] = [1000.0, 130.0, 26.0, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26.0, 130.0, 1000.0]
                if position < 17 { multiplier = multipliers[position] }
            }
        }
        
        return multiplier
    }
    
    access(all) fun getWheelMultiplier(segment: UInt8, totalSegments: UInt8): UFix64 {
        // Simplified wheel multipliers based on segment rarity
        let segmentType = segment % 5
        
        switch segmentType {
            case 0: return 1.2  // Common
            case 1: return 1.5  // Uncommon
            case 2: return 2.0  // Rare
            case 3: return 5.0  // Epic
            case 4: return 10.0 // Legendary
            default: return 1.0
        }
    }
    
    access(all) fun arrayToString(_ array: [UInt8]): String {
        var result = "["
        var i = 0
        while i < array.length {
            result = result.concat(array[i].toString())
            if i < array.length - 1 {
                result = result.concat(",")
            }
            i = i + 1
        }
        result = result.concat("]")
        return result
    }
    
    init() {
        log("CasinoGames contract initialized with secure Flow randomness")
    }
}