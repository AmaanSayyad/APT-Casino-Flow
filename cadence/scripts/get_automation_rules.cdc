import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

// Get Flow Automation Rules Script
// This script retrieves all automation rules for a given account

access(all) fun main(account: Address): {UInt64: AutomationRuleInfo} {
    
    // Get account reference
    let accountRef = getAccount(account)
    
    // Try to borrow automation manager capability
    if let automationCap = accountRef.capabilities.get<&AutomationManager>(/public/FlowAutomation) {
        if let automationManager = automationCap.borrow() {
            let rules = automationManager.getRules()
            let ruleInfos: {UInt64: AutomationRuleInfo} = {}
            
            // Convert rules to info structs for return
            for ruleId in rules.keys {
                if let rule = rules[ruleId] {
                    ruleInfos[ruleId] = AutomationRuleInfo(
                        id: rule.id,
                        name: rule.name,
                        ruleType: rule.ruleType,
                        condition: rule.condition,
                        action: rule.action,
                        isActive: rule.isActive,
                        lastExecuted: rule.lastExecuted,
                        executionCount: rule.executionCount,
                        parameters: rule.parameters
                    )
                }
            }
            
            return ruleInfos
        }
    }
    
    // Return empty if no automation setup
    return {}
}

// Automation Rule Info Struct for script return
access(all) struct AutomationRuleInfo {
    access(all) let id: UInt64
    access(all) let name: String
    access(all) let ruleType: String
    access(all) let condition: String
    access(all) let action: String
    access(all) let isActive: Bool
    access(all) let lastExecuted: UFix64?
    access(all) let executionCount: UInt64
    access(all) let parameters: {String: AnyStruct}
    
    init(
        id: UInt64,
        name: String,
        ruleType: String,
        condition: String,
        action: String,
        isActive: Bool,
        lastExecuted: UFix64?,
        executionCount: UInt64,
        parameters: {String: AnyStruct}
    ) {
        self.id = id
        self.name = name
        self.ruleType = ruleType
        self.condition = condition
        self.action = action
        self.isActive = isActive
        self.lastExecuted = lastExecuted
        self.executionCount = executionCount
        self.parameters = parameters
    }
}

// Reference to AutomationManager and AutomationRule
// These would be imported from the main contract

access(all) resource interface AutomationManagerPublic {
    access(all) fun getRules(): {UInt64: AutomationRule}
}

access(all) resource AutomationManager: AutomationManagerPublic {
    access(all) var rules: {UInt64: AutomationRule}
    access(all) var nextRuleId: UInt64
    
    init() {
        self.rules = {}
        self.nextRuleId = 1
    }
    
    access(all) fun getRules(): {UInt64: AutomationRule} {
        return self.rules
    }
}

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
}