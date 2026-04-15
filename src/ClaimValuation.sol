// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice ETH-denominated valuation layer for OZC claims.
/// Anyone can commit ETH to a claim. The ETH is forwarded to the creator.
/// Committed ETH accumulates on-chain as the single universal metric that
/// AI / other systems can read to understand human valuation of a claim.
///
/// This is NOT a speculation vehicle: committed ETH cannot be withdrawn.
/// It is a one-way signal of human commitment, denominated in globally-legible currency.

interface ICVRegistry {
    function entries(uint256 id) external view returns (bytes32, address creator, string memory, uint256, uint256, uint256, bool exists);
}

contract ClaimValuation {
    ICVRegistry public immutable registry;

    mapping(uint256 => uint256) public totalCommittedETH;     // claim id => total ETH committed
    mapping(address => uint256) public totalReceivedAsCreator;// creator => total ETH received

    event Committed(uint256 indexed id, address indexed committer, address indexed creator, uint256 amount);

    constructor(address _registry) {
        registry = ICVRegistry(_registry);
    }

    function commit(uint256 id) external payable {
        require(msg.value > 0, "zero commit");
        (, address creator, , , , , bool exists) = registry.entries(id);
        require(exists, "claim not found");

        totalCommittedETH[id]            += msg.value;
        totalReceivedAsCreator[creator]  += msg.value;

        (bool ok, ) = creator.call{value: msg.value}("");
        require(ok, "creator transfer failed");

        emit Committed(id, msg.sender, creator, msg.value);
    }

    /// @notice The single universal number: how much ETH humans have committed to this claim.
    function valuationETH(uint256 id) external view returns (uint256) {
        return totalCommittedETH[id];
    }
}
