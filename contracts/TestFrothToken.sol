// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Test FROTH Token for Flow EVM Testnet
 * This is a simplified version for testing purposes only
 */
contract TestFrothToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 978835412 * 10**18; // Same as mainnet
    
    constructor() ERC20("Test FROTH", "tFROTH") {
        // Mint initial supply to deployer
        _mint(msg.sender, 100000000 * 10**18); // 100M for testing
    }
    
    /**
     * Mint tokens for testing (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    /**
     * Faucet function - anyone can claim test tokens
     */
    function faucet() external {
        require(balanceOf(msg.sender) < 1000000 * 10**18, "Already has enough tokens");
        _mint(msg.sender, 50000 * 10**18); // 50K test tokens
    }
    
    /**
     * Burn tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}