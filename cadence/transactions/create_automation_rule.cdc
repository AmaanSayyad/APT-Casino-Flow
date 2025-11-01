import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

// Create Flow Automation Rule Transaction
// This transaction creates a new automation rule for the user

transaction(
    name: String,
    ruleType: String,
    condition: String,
    action: String,
    amount: UFix64?,
    threshold: UFix64?,
    frequency: UInt64?
) {
    prepare(signer: auth(BorrowValue) &Account) {
        
        // Get automation manager reference
        let automationManager = signer.storage.borrow<&AutomationManager>(from: /storage/FlowAutomation)
            ?? panic("Automation manager not found. Please setup automation first.")
        
        // Prepare parameters
        let parameters: {String: AnyStruct} = {}
        if let amt = amount {
            parameters["amount"] = amt
        }
        if let thresh = threshold {
            parameters["threshold"] = thresh
        }
        if let freq = frequency {
            parameters["frequency"] = freq
        }
        
        // Create the rule
        let ruleId = automationManager.createRule(
            name: name,
            ruleType: ruleType,
            condition: condition,
            action: action,
            parameters: parameters
        )
        
        log("Created automation rule with ID: ".concat(ruleId.toString()))
    }
}

// Automation Manager Resource (referenced from setup_automation.cdc)
access(all) resource AutomationManager {
    access(all) var rules: {UInt64: AutomationRule}
    access(all) var nextRuleId: UInt64
    
    init() {
        self.rules = {}
        self.nextRuleId = 1
    }
    
    access(all) fun createRule(
        name: String,
        ruleType: String,
        condition: String,
        action: String,
        parameters: {String: AnyStruct}
    ): UInt64 {
        let rule = AutomationRule(
            id: self.nextRuleId,
            name: name,
            ruleType: ruleType,
            condition: condition,
            action: action,
            parameters: parameters
        )
        
        self.rules[self.nextRuleId] = rule
        let ruleId = self.nextRuleId
        self.nextRuleId = self.nextRuleId + 1
        
        emit AutomationRuleCreated(
            ruleId: ruleId,
            owner: self.owner?.address,
            name: name,
            ruleType: ruleType
        )
        
        return ruleId
    }
    
    access(all) fun toggleRule(ruleId: UInt64) {
        if let rule = self.rules[ruleId] {
            rule.isActive = !rule.isActive
            
            emit AutomationRuleToggled(
                ruleId: ruleId,
                owner: self.owner?.address,
                isActive: rule.isActive
            )
        }
    }
    
    access(all) fun executeRule(ruleId: UInt64): Bool {
        if let rule = self.rules[ruleId] {
            if rule.isActive && rule.checkCondition() {
                let success = rule.execute()
                
                if success {
                    emit AutomationRuleExecuted(
                        ruleId: ruleId,
                        owner: self.owner?.address,
                        executionCount: rule.executionCount
                    )
                }
                
                return success
            }
        }
        return false
    }
    
    access(all) fun getRules(): {UInt64: AutomationRule} {
        return self.rules
    }
}

// Automation Rule Struct
access(all) struct AutomationRule {
    access(all) let id: UInt64
    access(all) let name: String
    access(all) let ruleType: String
    access(all) let condition: String
    access(all) let action: String
    access(all) let parameters: {String: AnyStruct}
    access(all) var isActive: Bool
    access(all) var lastExecuted: UFix64?
    access(all) var executionCount: UInt64
    
    init(
        id: UInt64,
        name: String,
        ruleType: String,
        condition: String,
        action: String,
        parameters: {String: AnyStruct}
    ) {
        self.id = id
        self.name = name
        self.ruleType = ruleType
        self.condition = condition
        self.action = action
        self.parameters = parameters
        self.isActive = true
        self.lastExecuted = nil
        self.executionCount = 0
    }
    
    access(all) fun checkCondition(): Bool {
        // Implement condition checking logic based on rule type
        switch self.ruleType {
            case "auto_stake":
                return self.checkBalanceThreshold()
            case "compound":
                return self.checkRewardThreshold()
            case "rebalance":
                return self.checkTimeCondition()
            default:
                return false
        }
    }
    
    access(all) fun checkBalanceThreshold(): Bool {
        // Check if balance meets threshold for auto-staking
        if let threshold = self.parameters["threshold"] as? UFix64 {
            // This would check actual FLOW balance
            return true // Simplified for demo
        }
        return false
    }
    
    access(all) fun checkRewardThreshold(): Bool {
        // Check if rewards meet threshold for compounding
        if let threshold = self.parameters["threshold"] as? UFix64 {
            // This would check actual staking rewards
            return true // Simplified for demo
        }
        return false
    }
    
    access(all) fun checkTimeCondition(): Bool {
        // Check if enough time has passed for rebalancing
        if let frequency = self.parameters["frequency"] as? UInt64 {
            if let lastExec = self.lastExecuted {
                let timePassed = getCurrentBlock().timestamp - lastExec
                return timePassed >= UFix64(frequency)
            }
            return true // First execution
        }
        return false
    }
    
    access(all) fun execute(): Bool {
        // Execute the automation action
        switch self.ruleType {
            case "auto_stake":
                return self.executeAutoStake()
            case "compound":
                return self.executeCompound()
            case "rebalance":
                return self.executeRebalance()
            default:
                return false
        }
    }
    
    access(all) fun executeAutoStake(): Bool {
        // Implement auto-staking logic
        self.lastExecuted = getCurrentBlock().timestamp
        self.executionCount = self.executionCount + 1
        return true
    }
    
    access(all) fun executeCompound(): Bool {
        // Implement reward compounding logic
        self.lastExecuted = getCurrentBlock().timestamp
        self.executionCount = self.executionCount + 1
        return true
    }
    
    access(all) fun executeRebalance(): Bool {
        // Implement portfolio rebalancing logic
        self.lastExecuted = getCurrentBlock().timestamp
        self.executionCount = self.executionCount + 1
        return true
    }
}

// Events
access(all) event AutomationRuleCreated(ruleId: UInt64, owner: Address?, name: String, ruleType: String)
access(all) event AutomationRuleToggled(ruleId: UInt64, owner: Address?, isActive: Bool)
access(all) event AutomationRuleExecuted(ruleId: UInt64, owner: Address?, executionCount: UInt64)