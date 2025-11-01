const crypto = require('crypto');
const { ec } = require('elliptic');

// Create Flow Treasury Wallet
function createFlowTreasuryWallet() {
  console.log('🏦 Creating Flow Treasury Wallet...');
  
  // Generate a new ECDSA key pair for Flow (using secp256k1 curve)
  const secp256k1 = new ec('secp256k1');
  const keyPair = secp256k1.genKeyPair();
  
  // Get private key as hex string
  const privateKey = keyPair.getPrivate('hex');
  
  // Get public key
  const publicKey = keyPair.getPublic();
  const publicKeyHex = publicKey.encode('hex');
  
  // For Flow testnet, we'll use a simplified address generation
  // In production, you'd use proper Flow address generation
  const addressBytes = crypto.createHash('sha256')
    .update(Buffer.from(publicKeyHex, 'hex'))
    .digest()
    .slice(0, 8); // Flow addresses are 8 bytes
  
  const address = '0x' + addressBytes.toString('hex');
  
  console.log('✅ Flow Treasury Wallet Created!');
  console.log('');
  console.log('📋 Treasury Details:');
  console.log('Private Key:', privateKey);
  console.log('Public Key:', publicKeyHex);
  console.log('Address:', address);
  console.log('');
  console.log('🔒 SECURITY WARNING:');
  console.log('- Keep the private key secure and never share it');
  console.log('- Add the private key to your .env file as FLOW_TREASURY_PRIVATE_KEY');
  console.log('- Add the address to your .env file as NEXT_PUBLIC_FLOW_TREASURY_ADDRESS');
  console.log('');
  console.log('📝 Add these to your .env file:');
  console.log(`FLOW_TREASURY_PRIVATE_KEY=${privateKey}`);
  console.log(`NEXT_PUBLIC_FLOW_TREASURY_ADDRESS=${address}`);
  console.log('');
  console.log('💡 Next steps:');
  console.log('1. Fund this treasury wallet with FLOW tokens on testnet');
  console.log('2. Test deposit/withdraw functionality');
  console.log('3. Update your Flow config with the new address');
  
  return {
    privateKey,
    publicKey: publicKeyHex,
    address
  };
}

// Run the script
if (require.main === module) {
  createFlowTreasuryWallet();
}

module.exports = { createFlowTreasuryWallet };





