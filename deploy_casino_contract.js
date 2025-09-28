const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function deployCasinoContract() {
  console.log('🚀 Deploying CasinoGames contract to Flow Testnet...');
  
  try {
    // Check if contract file exists
    const contractPath = path.join(__dirname, 'cadence/contracts/CasinoGames.cdc');
    if (!fs.existsSync(contractPath)) {
      throw new Error('Contract file not found: ' + contractPath);
    }
    
    console.log('📄 Contract file found:', contractPath);
    
    // Deploy contract using Flow CLI
    const command = `flow accounts add-contract cadence/contracts/CasinoGames.cdc --signer treasury --network testnet`;
    
    console.log('🔧 Executing deployment command...');
    console.log('Command:', command);
    
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Deployment failed:', error);
          console.error('stderr:', stderr);
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
    
    console.log('✅ Deployment output:', stdout);
    if (stderr) console.log('⚠️ Warnings:', stderr);
    
    // Parse transaction ID from output
    const txIdMatch = stdout.match(/Transaction ID: ([a-f0-9]+)/);
    if (txIdMatch) {
      const transactionId = txIdMatch[1];
      console.log('📝 Deployment transaction ID:', transactionId);
      console.log('🔗 View on Flow Testnet Scanner:', `https://testnet.flowscan.io/tx/${transactionId}`);
    }
    
    console.log('🎉 CasinoGames contract deployed successfully!');
    console.log('📋 Contract Address: 0x2083a55fb16f8f60 (Treasury Account)');
    console.log('🌐 Network: Flow Testnet');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deployCasinoContract();