"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
// Using Next.js public asset reference instead of import
import { FaExternalLinkAlt } from "react-icons/fa";

const GameHistory = ({ gameHistory }) => {
  const [activeTab, setActiveTab] = useState("my-bet");
  const [entriesShown, setEntriesShown] = useState(10);

  // Format balance for display (show 0 instead of 0.00000)
  const formatBalance = (balance) => {
    const num = parseFloat(balance || '0');
    if (num === 0) return '0';
    // If it's a whole number, show without decimals
    if (num % 1 === 0) return num.toString();
    // Otherwise show with up to 5 decimals, removing trailing zeros
    return parseFloat(num.toFixed(5)).toString();
  };

  // Format transaction hash for display
  const formatTxHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Open Flow Explorer link
  const openFlowExplorer = (hash) => {
    if (hash) {
      const network = process.env.NEXT_PUBLIC_NETWORK || 'flow-testnet';
      let explorerUrl;

      if (network === 'flow-testnet') {
        explorerUrl = `https://testnet.flowscan.io/tx/${hash}`;
      } else if (network === 'flow-mainnet') {
        explorerUrl = `https://flowscan.io/tx/${hash}`;
      } else {
        explorerUrl = `https://testnet.flowscan.io/tx/${hash}`;
      }

      window.open(explorerUrl, '_blank');
    }
  };

  return (
    <div className="bg-[#070005] w-full rounded-xl overflow-hidden mt-0">
      <div className="flex flex-row justify-between items-center">

        <div className="flex mb-4 w-[70%] md:w-[30%] bg-[#120521] border border-[#333947] rounded-3xl p-2 gap-2 overflow-hidden">
          <div className={cn("w-1/2", activeTab === "my-bet" && "gradient-borderb")}>
            <button
              className={cn(
                "flex-1 py-0 md:py-3 px-4 w-full h-full text-center rounded-2xl transition-colors",
                activeTab === "my-bet" ? "bg-[#290023] text-white" : "text-[#333947]"
              )}
              onClick={() => setActiveTab("my-bet")}
            >
              My Bet
            </button>
          </div>
          <div className={cn("w-1/2", activeTab === "game-description" && "gradient-borderb")}>
            <button
              className={cn(
                "flex-1 py-0 md:py-3 px-4 w-full h-full text-center rounded-2xl transition-colors",
                activeTab === "game-description" ? "bg-[#290023] text-white" : "text-[#333947]"
              )}
              onClick={() => setActiveTab("game-description")}
            >
              Game Description
            </button>
          </div>
        </div>

        <div className="flex gradient-border mb-5 md:mb-0">
          <div className="flex space-x-4">
            <select
              className="bg-[#120521] text-white text-md p-3 px-2 md:px-6 rounded border border-purple-900/30"
              value={entriesShown}
              onChange={(e) => setEntriesShown(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

      </div>


      {activeTab === "my-bet" && (
        <div className="overflow-x-auto">
          <table className="w-full mt-4 text-md">
            <thead className=" text-left">
              <tr>
                <th className="py-6 px-4 font-medium">Game</th>
                <th className="py-6 px-4 font-medium">Time</th>
                <th className="py-6 px-4 font-medium">Bet amount</th>
                <th className="py-6 px-4 font-medium">Multiplier</th>
                <th className="py-6 px-4 font-medium">Payout</th>
                <th className="py-6 px-4 font-medium">Flow VRF</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.length > 0 ? (
                gameHistory.slice(0, entriesShown).map((item, index) => (
                  <tr
                    key={item.id}
                    className={index % 2 === 0 ? "bg-[#290023]" : ""}
                  >
                    <td className="py-6 px-4">{item.game}</td>
                    <td className="py-6 px-4">{item.time}</td>
                    <td className="py-6 px-4">
                      <span className="flex items-center">
                        {formatBalance(item.betAmount)}
                        <Image
                          src="/coin.png"
                          width={20}
                          height={20}
                          alt="coin"
                          className=""
                        />
                      </span>
                    </td>
                    <td className="py-6 px-4">{item.multiplier}</td>
                    <td className="py-6 px-4">
                      <span className="flex items-center">
                        {formatBalance(item.payout)}
                        <Image
                          src="/coin.png"
                          width={20}
                          height={20}
                          alt="coin"
                          className=""
                        />
                      </span>
                    </td>
                    <td className="py-6 px-4">
                      {(item.flowVRF || item.vrfData) ? (
                        <div className="text-xs text-gray-300 font-mono">
                          <div className="text-green-400 font-bold">
                            {item.flowVRF?.transactionId ? `TX: ${item.flowVRF.transactionId.slice(0, 8)}...` : 
                             item.vrfData?.requestId ? `Request: ${item.vrfData.requestId.slice(0, 8)}...` : ''}
                          </div>
                          {(item.flowVRF?.randomSeed || item.vrfData?.randomValue) && (
                            <div className="text-blue-400">
                              Random: {(item.flowVRF?.randomSeed || item.vrfData?.randomValue)?.toString().slice(0, 8)}...
                            </div>
                          )}
                          <div className="flex gap-1 mt-1">
                            {item.flowVRF?.transactionId && (
                              <button
                                onClick={() => openFlowExplorer(item.flowVRF.transactionId)}
                                className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs hover:bg-green-500/20 transition-colors"
                              >
                                <FaExternalLinkAlt size={8} />
                                Flow Tx
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-purple-400 text-xs">Generating...</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No game history yet. Place your first bet!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "game-description" && (
        <div className="p-4 text-sm text-gray-300">
          <h3 className="font-medium mb-2">Crazy Times</h3>
          <p>
            Crazy Times is an exciting game of chance where you place bets on a spinning wheel.
            Select your bet amount, risk level, and the number of segments on the wheel.
            The wheel will spin and land on a multiplier, which determines your payout.
            Higher risk levels can lead to higher multipliers but may be less likely to hit.
          </p>
          <h4 className="font-medium mt-4 mb-2">How to play:</h4>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Enter your bet amount</li>
            <li>Select your risk level (Low, Medium, High)</li>
            <li>Choose the number of segments for the wheel</li>
            <li>Click the &quot;Bet&quot; button to spin the wheel</li>
            <li>If the wheel lands on a multiplier, your bet amount will be multiplied accordingly</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default GameHistory;