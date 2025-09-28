import * as fcl from '@onflow/fcl';
import { FLOW_CONFIG } from '@/config/flowConfig';

// Flow VRF Contract Configuration
const FLOW_VRF_CONTRACT = FLOW_CONFIG.CONTRACTS.VRF_CONTRACT;
const FLOW_ACCESS_NODE = process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE || 'https://rest-testnet.onflow.org';

export async function POST(request) {
  try {
    console.log('🎲 API: Generating Flow VRF...');
    
    const { gameType, gameConfig } = await request.json();
    
    // Configure FCL
    fcl.config({
      'accessNode.api': FLOW_ACCESS_NODE,
      '0xFlowVRF': FLOW_VRF_CONTRACT,
    });
    
    // Generate unique request ID
    const requestId = `api_${gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate random seed
    const randomSeed = Math.random().toString(16).substr(2, 32);
    
    console.log('🔄 Requesting random value from Flow VRF...');
    console.log('📋 Request ID:', requestId);
    console.log('📋 Random seed:', randomSeed);
    
    // Create commit transaction
    const commitTx = fcl.transaction({
      cadence: `
        import FlowVRF from 0xFlowVRF

        transaction(requestId: String, randomSeed: String) {
          prepare(acct: AuthAccount) {
            FlowVRF.commitRandom(requestId: requestId, randomSeed: randomSeed)
          }
        }
      `,
      args: [
        fcl.arg(requestId, fcl.t.String),
        fcl.arg(randomSeed, fcl.t.String)
      ],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser]
    });
    
    // Submit commit transaction
    const commitResult = await fcl.tx(commitTx).onceSealed();
    
    if (commitResult.statusCode !== 4) {
      throw new Error(`Commit transaction failed: ${commitResult.errorMessage}`);
    }
    
    console.log('✅ Commit transaction confirmed:', commitResult.transactionId);
    
    // Wait for reveal delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create reveal transaction
    const revealTx = fcl.transaction({
      cadence: `
        import FlowVRF from 0xFlowVRF

        transaction(requestId: String, randomSeed: String) {
          prepare(acct: AuthAccount) {
            FlowVRF.revealRandom(requestId: requestId, randomSeed: randomSeed)
          }
        }
      `,
      args: [
        fcl.arg(requestId, fcl.t.String),
        fcl.arg(randomSeed, fcl.t.String)
      ],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser]
    });
    
    // Submit reveal transaction
    const revealResult = await fcl.tx(revealTx).onceSealed();
    
    if (revealResult.statusCode !== 4) {
      throw new Error(`Reveal transaction failed: ${revealResult.errorMessage}`);
    }
    
    console.log('✅ Reveal transaction confirmed:', revealResult.transactionId);
    
    // Get random value
    const randomValue = await fcl.query({
      cadence: `
        import FlowVRF from 0xFlowVRF

        pub fun main(requestId: String): String? {
          return FlowVRF.getRandomValue(requestId: requestId)
        }
      `,
      args: [fcl.arg(requestId, fcl.t.String)]
    });
    
    if (!randomValue) {
      throw new Error('Random value not available');
    }
    
    console.log('🎲 Random value:', randomValue);
    
    // Create entropy proof
    const entropyProof = {
      requestId: requestId,
      commitTx: commitResult.transactionId,
      revealTx: revealResult.transactionId,
      transactionHash: revealResult.transactionId, // Use reveal tx as main transaction
      blockNumber: revealResult.blockHeight,
      randomValue: randomValue,
      network: 'flow-testnet',
      explorerUrl: `https://testnet.flowscan.org/transaction/${revealResult.transactionId}`,
      timestamp: Date.now(),
      source: 'Flow VRF'
    };
    
    return Response.json({
      success: true,
      randomValue: randomValue,
      entropyProof: entropyProof,
      metadata: {
        source: 'Flow VRF',
        network: 'flow-testnet',
        algorithm: 'commit-reveal',
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ API: Error generating Flow VRF:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}