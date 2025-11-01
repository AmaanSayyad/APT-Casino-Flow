// Transfer FLOW tokens from treasury to user wallet
// This transaction allows treasury to send FLOW to users (withdraw operation)

import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

transaction(amount: UFix64, recipientAddress: Address) {
    
    // The Vault resource that holds the tokens that are being transferred
    let sentVault: @{FungibleToken.Vault}
    
    prepare(treasury: auth(BorrowValue) &Account) {
        
        // Get a reference to the treasury's stored vault
        let vaultRef = treasury.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow reference to the treasury's Vault!")

        // Check if treasury has sufficient balance
        if vaultRef.balance < amount {
            panic("Insufficient FLOW balance in treasury. Available: ".concat(vaultRef.balance.toString()).concat(", Requested: ").concat(amount.toString()))
        }

        // Withdraw tokens from the treasury's stored vault
        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        // Get the recipient's public account object
        let recipient = getAccount(recipientAddress)

        // Get a reference to the recipient's Receiver
        let receiverRef = recipient.capabilities.borrow<&{FungibleToken.Receiver}>(
            /public/flowTokenReceiver
        ) ?? panic("Could not borrow receiver reference to the recipient account")

        // Deposit the withdrawn tokens in the recipient's receiver
        receiverRef.deposit(from: <-self.sentVault)
        
        log("Successfully transferred FLOW from treasury to user")
    }
}
