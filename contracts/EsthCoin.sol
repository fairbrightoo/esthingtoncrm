// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts@4.9.3/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.9.3/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts@4.9.3/security/Pausable.sol";
import "@openzeppelin/contracts@4.9.3/access/AccessControl.sol";

/**
 * @title EsthCoin (ESTH)
 * @dev Implementation of the EsthCoin token for the Esthington Group.
 * Features:
 * - ERC20 Standard
 * - Burnable (For Real Estate Discount Burn Protocol)
 * - Pausable (Emergency Security Stop)
 * - Role-Based Access Control
 * - Hard Capped Supply (100,000,000 ESTH)
 */
contract EsthCoin is ERC20, ERC20Burnable, Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Hard Capped Supply: 100,000,000 tokens (18 decimal places)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    constructor() ERC20("EsthCoin", "ESTH") {
        // Grant the deployer the Admin and Pauser roles automatically
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Mint the absolute maximum supply instantly to the Treasury (Deployer).
        // Since there is no mint function in this contract, it is mathematically
        // impossible for any more EsthCoins to ever be created.
        _mint(msg.sender, MAX_SUPPLY);
    }

    /**
     * @dev Freezes all token transfers in case of an emergency (e.g., exchange hack).
     * Can only be called by an account with the PAUSER_ROLE.
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unfreezes all token transfers.
     * Can only be called by an account with the PAUSER_ROLE.
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     * Enforces the Pausable security mechanism.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}
