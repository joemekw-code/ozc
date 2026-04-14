// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Linear bonding curve: price = BASE + SLOPE * supply
/// Simple, auditable, easy to tune after launch feedback.
library BondingCurve {
    uint256 public constant BASE  = 1e15;  // 0.001 OZC minimum per share
    uint256 public constant SLOPE = 1e12;  // price increase per share outstanding

    /// @return cost OZC needed to buy `shares` when current supply is `supply`
    function buyPrice(uint256 supply, uint256 shares) internal pure returns (uint256 cost) {
        // sum of prices from supply to supply+shares (arithmetic series)
        // cost = shares * BASE + SLOPE * (supply * shares + shares*(shares-1)/2)
        cost = shares * BASE + SLOPE * (supply * shares + (shares * (shares - 1)) / 2);
    }

    /// @return proceeds OZC returned when selling `shares` from current supply
    function sellPrice(uint256 supply, uint256 shares) internal pure returns (uint256 proceeds) {
        require(supply >= shares, "undersupply");
        uint256 newSupply = supply - shares;
        proceeds = shares * BASE + SLOPE * (newSupply * shares + (shares * (shares - 1)) / 2);
    }
}
