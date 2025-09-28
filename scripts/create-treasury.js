const { ethers } = require('ethers');

// Generate a new random wallet for the casino treasury
const treasuryWallet = ethers.Wallet.createRandom();

console.log('🎰 Casino Treasury Wallet Created!');
console.log('=====================================');
console.log('Address:', treasuryWallet.address);
console.log('Private Key:', treasuryWallet.privateKey);
console.log('Mnemonic:', treasuryWallet.mnemonic.phrase);
console.log('=====================================');
console.log('');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Save this private key securely');
console.log('2. Never share or commit it to git');
console.log('3. Use only for development/testing');
console.log('4. Fund this wallet with Flow Testnet ARB FLOW for testing');
console.log('');
console.log('🔗 Flow Testnet Faucet: https://faucet.triangleplatform.com/flow/testnet');
console.log('🔗 Flow Testnet Explorer: https://testnet.arbiscan.io/');
console.log('');
console.log('📝 Next steps:');
console.log('1. Copy the address above');
console.log('2. Get Flow Testnet ARB FLOW from faucet');
console.log('3. Update treasury config with this address');
console.log('4. Deploy VRF contracts on Flow Testnet');
console.log('5. Test deposit/withdraw functionality with ARB FLOW');
