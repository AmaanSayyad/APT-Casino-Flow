/**
 * Flow VRF Contract
 * Provides verifiable random number generation using commit-reveal scheme
 */

import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

/// VRF Request resource
pub resource VRFRequest {
    pub let requestId: String
    pub let randomSeed: String
    pub let committedAt: UInt64
    pub let revealedAt: UInt64?
    pub let randomValue: String?
    
    init(requestId: String, randomSeed: String, committedAt: UInt64) {
        self.requestId = requestId
        self.randomSeed = randomSeed
        self.committedAt = committedAt
        self.revealedAt = nil
        self.randomValue = nil
    }
    
    pub fun reveal(randomSeed: String): String {
        pre {
            self.randomSeed == randomSeed: "Random seed does not match"
            self.revealedAt == nil: "Request already revealed"
        }
        
        // Generate random value using commit-reveal scheme
        let randomValue = self.generateRandomValue(randomSeed: randomSeed)
        
        self.revealedAt = getCurrentBlock().height
        self.randomValue = randomValue
        
        return randomValue
    }
    
    access(contract) fun generateRandomValue(randomSeed: String): String {
        // Use Flow's built-in randomness with the seed
        let randomBytes = sha3_256(randomSeed.utf8)
        return randomBytes.toString()
    }
}

/// VRF Manager resource
pub resource VRFManager {
    pub let requests: {String: VRFRequest}
    pub let commitDelay: UInt64
    
    init(commitDelay: UInt64 = 1) {
        self.requests = {}
        self.commitDelay = commitDelay
    }
    
    /// Commit a random seed for a request
    pub fun commitRandom(requestId: String, randomSeed: String) {
        pre {
            !self.requests.containsKey(requestId): "Request ID already exists"
            randomSeed.length > 0: "Random seed cannot be empty"
        }
        
        let request = VRFRequest(
            requestId: requestId,
            randomSeed: randomSeed,
            committedAt: getCurrentBlock().height
        )
        
        self.requests[requestId] = request
    }
    
    /// Reveal the random value for a request
    pub fun revealRandom(requestId: String, randomSeed: String): String {
        pre {
            self.requests.containsKey(requestId): "Request ID does not exist"
        }
        
        let request = self.requests[requestId]!
        
        pre {
            getCurrentBlock().height >= request.committedAt + self.commitDelay: "Reveal delay not met"
        }
        
        return request.reveal(randomSeed: randomSeed)
    }
    
    /// Get random value for a request
    pub fun getRandomValue(requestId: String): String? {
        if let request = self.requests[requestId] {
            return request.randomValue
        }
        return nil
    }
    
    /// Check if request is fulfilled
    pub fun isRequestFulfilled(requestId: String): Bool {
        if let request = self.requests[requestId] {
            return request.randomValue != nil
        }
        return false
    }
    
    /// Get request details
    pub fun getRequest(requestId: String): VRFRequest? {
        return self.requests[requestId]
    }
}

/// VRF Provider resource
pub resource VRFProvider {
    pub let manager: &VRFManager
    
    init(manager: &VRFManager) {
        self.manager = manager
    }
    
    /// Create a new VRF request
    pub fun createRequest(requestId: String, randomSeed: String) {
        self.manager.commitRandom(requestId: requestId, randomSeed: randomSeed)
    }
    
    /// Reveal a VRF request
    pub fun revealRequest(requestId: String, randomSeed: String): String {
        return self.manager.revealRandom(requestId: requestId, randomSeed: randomSeed)
    }
    
    /// Get random value
    pub fun getRandomValue(requestId: String): String? {
        return self.manager.getRandomValue(requestId: requestId)
    }
    
    /// Check if request is fulfilled
    pub fun isRequestFulfilled(requestId: String): Bool {
        return self.manager.isRequestFulfilled(requestId: requestId)
    }
}

/// VRF Contract
pub contract FlowVRF {
    pub let VRFManager: {String: VRFManager}
    pub let VRFProvider: {String: VRFProvider}
    
    pub event RandomnessRequested(requestId: String, requester: Address, committedAt: UInt64)
    pub event RandomnessRevealed(requestId: String, randomValue: String, revealedAt: UInt64)
    
    init() {
        self.VRFManager = {}
        self.VRFProvider = {}
    }
    
    /// Create a new VRF manager
    pub fun createVRFManager(managerId: String, commitDelay: UInt64 = 1) {
        pre {
            !self.VRFManager.containsKey(managerId): "Manager ID already exists"
        }
        
        let manager = VRFManager(commitDelay: commitDelay)
        self.VRFManager[managerId] = manager
    }
    
    /// Create a VRF provider for a manager
    pub fun createVRFProvider(providerId: String, managerId: String) {
        pre {
            !self.VRFProvider.containsKey(providerId): "Provider ID already exists"
            self.VRFManager.containsKey(managerId): "Manager does not exist"
        }
        
        let manager = self.VRFManager[managerId]!
        let provider = VRFProvider(manager: &manager)
        self.VRFProvider[providerId] = provider
    }
    
    /// Commit random seed
    pub fun commitRandom(requestId: String, randomSeed: String) {
        let manager = self.VRFManager["default"]!
        manager.commitRandom(requestId: requestId, randomSeed: randomSeed)
        
        emit RandomnessRequested(
            requestId: requestId,
            requester: getCurrentBlock().height,
            committedAt: getCurrentBlock().height
        )
    }
    
    /// Reveal random value
    pub fun revealRandom(requestId: String, randomSeed: String): String {
        let manager = self.VRFManager["default"]!
        let randomValue = manager.revealRandom(requestId: requestId, randomSeed: randomSeed)
        
        emit RandomnessRevealed(
            requestId: requestId,
            randomValue: randomValue,
            revealedAt: getCurrentBlock().height
        )
        
        return randomValue
    }
    
    /// Get random value
    pub fun getRandomValue(requestId: String): String? {
        let manager = self.VRFManager["default"]!
        return manager.getRandomValue(requestId: requestId)
    }
    
    /// Check if request is fulfilled
    pub fun isRequestFulfilled(requestId: String): Bool {
        let manager = self.VRFManager["default"]!
        return manager.isRequestFulfilled(requestId: requestId)
    }
    
    /// Get request details
    pub fun getRequest(requestId: String): VRFRequest? {
        let manager = self.VRFManager["default"]!
        return manager.getRequest(requestId: requestId)
    }
}
