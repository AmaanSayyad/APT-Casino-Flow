// Transfer FLOW tokens from user wallet to treasury
// This transaction allows users to deposit FLOW to the casino treasury

import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

transaction(amount: UFix64, treasuryAddress: Address) {
    
    // The Vault resource that holds the tokens that are being transferred
    let sentVault: @{FungibleToken.Vault}
    
    prepare(signer: auth(BorrowValue) &Account) {
        
        // Get a reference to the signer's stored vault
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow reference to the owner's Vault!")

        // Withdraw tokens from the signer's stored vault
        self.sentVault <- vaultRef.withdraw(amount: amount)
    }

    execute {
        // Get the recipient's public account object
        let recipient = getAccount(treasuryAddress)

        // Get a reference to the recipient's Receiver
        let receiverRef = recipient.capabilities.borrow<&{FungibleToken.Receiver}>(
            /public/flowTokenReceiver
        ) ?? panic("Could not borrow receiver reference to the treasury account")

        // Deposit the withdrawn tokens in the recipient's receiver
        receiverRef.deposit(from: <-self.sentVault)
        
        log("Successfully transferred FLOW to treasury")
    }
}
