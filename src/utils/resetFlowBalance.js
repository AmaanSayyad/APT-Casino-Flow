// Utility to reset corrupted Flow balance

export const resetFlowBalance = () => {
  if (typeof window !== 'undefined') {
    console.log('🔄 Resetting Flow balance...');
    
    // Clear all Flow balance related localStorage items
    localStorage.removeItem('userFlowBalance');
    
    // Clear address-specific balances
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('userFlowBalance_')) {
        localStorage.removeItem(key);
        console.log('Removed:', key);
      }
    });
    
    // Set clean balance
    localStorage.setItem('userFlowBalance', '0');
    
    console.log('✅ Flow balance reset complete');
    
    // Reload page to apply changes
    window.location.reload();
  }
};

// Check if balance is corrupted
export const isFlowBalanceCorrupted = () => {
  if (typeof window !== 'undefined') {
    const balance = localStorage.getItem('userFlowBalance');
    return balance && parseFloat(balance) > 100000;
  }
  return false;
};