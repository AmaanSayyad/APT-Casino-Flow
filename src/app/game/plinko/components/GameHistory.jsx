"use client";
import { useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

export default function GameHistory({ history }) {
  const [visibleCount, setVisibleCount] = useState(5);
  
  // Open Flow Explorer link for transaction hash
  const openFlowExplorer = (txHash) => {
    if (txHash && txHash !== 'unknown') {
      const network = process.env.NEXT_PUBLIC_NETWORK || 'flow-testnet';
      let explorerUrl;
      
      if (network === 'flow-testnet') {
        explorerUrl = `https://testnet.flowscan.io/tx/${txHash}`;
      } else if (network === 'flow-mainnet') {
        explorerUrl = `https://flowscan.io/tx/${txHash}`;
      } else {
        explorerUrl = `https://testnet.flowscan.io/tx/${txHash}`;
      }
      
      window.open(explorerUrl, '_blank');
    }
  };


  
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Game History</h3>
        {history.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((c) => Math.min(c + 5, history.length))}
            className="bg-[#2A0025] border border-[#333947] rounded-lg px-3 py-2 text-sm text-white hover:bg-[#3A0035] transition-colors"
          >
            Show more
          </button>
        )}
      </div>

      {/* Game History Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333947]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Game
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Title
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Bet amount
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Multiplier
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Payout
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Flow Explorer
              </th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, visibleCount).map((game) => (
              <tr key={game.id} className="border-b border-[#333947]/30 hover:bg-[#2A0025]/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">P</span>
                    </div>
                    <span className="text-white text-sm">Plinko</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.title}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.betAmount}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.multiplier}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.payout}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    {(game.flowVRF || game.vrfData) ? (
                      <>
                        <div className="text-xs text-gray-300 font-mono">
                          <div className="text-green-400 font-bold">
                            {game.flowVRF?.transactionId ? `TX: ${game.flowVRF.transactionId.slice(0, 8)}...` : 
                             game.vrfData?.requestId ? `Request: ${game.vrfData.requestId.slice(0, 8)}...` : ''}
                          </div>
                          {(game.flowVRF?.randomSeed || game.vrfData?.randomValue) && (
                            <div className="text-blue-400">
                              Random: {(game.flowVRF?.randomSeed || game.vrfData?.randomValue)?.toString().slice(0, 8)}...
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {(game.flowVRF?.transactionId || game.transactionHash) && (
                            <button
                              onClick={() => openFlowExplorer(game.flowVRF?.transactionId || game.transactionHash)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs hover:bg-green-500/20 transition-colors"
                            >
                              <FaExternalLinkAlt size={8} />
                              Flow Tx
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-1">
                        {game.transactionHash && (
                          <button
                            onClick={() => openFlowExplorer(game.transactionHash)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs hover:bg-green-500/20 transition-colors"
                          >
                            <FaExternalLinkAlt size={8} />
                            Flow Tx
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {history.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#2A0025] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">📊</span>
          </div>
          <p className="text-gray-400 text-sm">No games played yet</p>
          <p className="text-gray-500 text-xs mt-1">Start playing to see your game history</p>
        </div>
      )}

      <div className="mt-4 text-center text-gray-400 text-sm">
        Showing {Math.min(visibleCount, history.length)} of {history.length} entries
      </div>
    </div>
  );
}
