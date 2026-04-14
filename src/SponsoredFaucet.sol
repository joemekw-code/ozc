// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISpToken {
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @notice Anyone can call claimFor(recipient). Gas is paid by caller (relayer),
/// OZC is received by recipient. Still one-time per recipient.
/// Lets new users enter with ZERO Base ETH — a sponsor pays the claim gas.
contract SponsoredFaucet {
    ISpToken public immutable ozc;
    uint256  public constant GRANT = 100 * 1e18;
    mapping(address => bool) public claimed;

    event Claimed(address indexed recipient, address indexed sponsor, uint256 amount);

    constructor(address _ozc) {
        ozc = ISpToken(_ozc);
    }

    /// Self-service (recipient pays gas)
    function claim() external {
        _issue(msg.sender);
    }

    /// Relayer-service: anyone can sponsor a new address's claim.
    /// No signature required because grant is 1-shot per recipient; no upside to griefing.
    function claimFor(address recipient) external {
        _issue(recipient);
        emit Claimed(recipient, msg.sender, GRANT);
    }

    function _issue(address to) internal {
        require(!claimed[to], "already claimed");
        require(ozc.balanceOf(address(this)) >= GRANT, "faucet empty");
        claimed[to] = true;
        require(ozc.transfer(to, GRANT), "transfer failed");
        if (to == msg.sender) emit Claimed(to, address(0), GRANT);
    }

    function remaining() external view returns (uint256) {
        return ozc.balanceOf(address(this));
    }
}
