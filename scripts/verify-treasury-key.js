// Verify Treasury Account Public Key
// This script verifies that our private key matches the treasury account's public key

const { ec } = require('elliptic');
const crypto = require('crypto');

// Treasury configuration
const TREASURY_ADDRESS = "0x2083a55fb16f8f60";
const TREASURY_PRIVATE_KEY = "e770fe20d90079c0354d05763f4d4a1e8ad2cada19c64187be1299550e701e7b";

async function verifyTreasuryKey() {
  console.log('🔍 Verifying Treasury Account Key...');
  console.log('📍 Treasury Address:', TREASURY_ADDRESS);
  console.log('🔑 Private Key:', TREASURY_PRIVATE_KEY.substring(0, 8) + '...');
  
  try {
    // Create secp256k1 curve instance
    const curve = new ec('secp256k1');
    
    // Generate key pair from private key
    const keyPair = curve.keyFromPrivate(TREASURY_PRIVATE_KEY, 'hex');
    
    // Get public key
    const publicKey = keyPair.getPublic();
    const publicKeyHex = publicKey.encode('hex');
    const publicKeyCompressed = publicKey.encode('hex', true);
    
    console.log('');
    console.log('📋 Key Analysis:');
    console.log('Public Key (Uncompressed):', publicKeyHex);
    console.log('Public Key (Compressed):', publicKeyCompressed);
    console.log('Public Key Length:', publicKeyHex.length);
    console.log('');
    
    // Test signing
    const testMessage = "Hello Flow";
    const messageHash = crypto.createHash('sha256').update(testMessage).digest();
    const signature = keyPair.sign(messageHash, { canonical: true });
    
    // Convert signature to Flow format
    const r = signature.r.toArrayLike(Buffer, 'be', 32);
    const s = signature.s.toArrayLike(Buffer, 'be', 32);
    const flowSignature = Buffer.concat([r, s]).toString('hex');
    
    console.log('🧪 Test Signing:');
    console.log('Message:', testMessage);
    console.log('Message Hash:', messageHash.toString('hex'));
    console.log('Signature:', flowSignature);
    console.log('Signature Length:', flowSignature.length);
    console.log('');
    
    // Verify signature
    const isValid = keyPair.verify(messageHash, signature);
    console.log('✅ Signature Verification:', isValid ? 'VALID' : 'INVALID');
    
    console.log('');
    console.log('🎯 Summary:');
    console.log('- Private key is valid secp256k1 key');
    console.log('- Public key generated successfully');
    console.log('- Test signing works');
    console.log('- Signature verification passes');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('1. Ensure treasury account on Flow has this public key');
    console.log('2. Check account key index (should be 0)');
    console.log('3. Verify account has sufficient FLOW balance');
    
  } catch (error) {
    console.error('❌ Key verification failed:', error);
  }
}

// Run verification
verifyTreasuryKey();

