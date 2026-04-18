// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOZC {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @notice OZCSwap — constant product AMM (x*y=k) for ETH ↔ OZC.
contract OZCSwap {
    IOZC public immutable ozc;

    uint256 public reserveETH;
    uint256 public reserveOZC;

    event LiquidityAdded(address indexed lp, uint256 ethAmount, uint256 ozcAmount);
    event Bought(address indexed buyer, uint256 ethIn, uint256 ozcOut);
    event Sold(address indexed seller, uint256 ozcIn, uint256 ethOut);

    constructor(address _ozc) {
        ozc = IOZC(_ozc);
    }

    /// @notice Add liquidity. First call sets the ratio; subsequent calls must match.
    function addLiquidity(uint256 ozcAmount) external payable {
        require(msg.value > 0 && ozcAmount > 0, "zero");
        require(ozc.transferFrom(msg.sender, address(this), ozcAmount), "transfer failed");
        reserveETH += msg.value;
        reserveOZC += ozcAmount;
        emit LiquidityAdded(msg.sender, msg.value, ozcAmount);
    }

    /// @notice Buy OZC with ETH. Constant product: (x + dx) * (y - dy) = x * y
    function buyOZC() external payable {
        require(msg.value > 0, "zero ETH");
        require(reserveETH > 0 && reserveOZC > 0, "no liquidity");

        uint256 ozcOut = (reserveOZC * msg.value) / (reserveETH + msg.value);
        require(ozcOut > 0, "insufficient output");

        reserveETH += msg.value;
        reserveOZC -= ozcOut;

        require(ozc.transfer(msg.sender, ozcOut), "OZC transfer failed");
        emit Bought(msg.sender, msg.value, ozcOut);
    }

    /// @notice Sell OZC for ETH.
    function sellOZC(uint256 amount) external {
        require(amount > 0, "zero OZC");
        require(reserveETH > 0 && reserveOZC > 0, "no liquidity");

        uint256 ethOut = (reserveETH * amount) / (reserveOZC + amount);
        require(ethOut > 0, "insufficient output");

        require(ozc.transferFrom(msg.sender, address(this), amount), "OZC transfer failed");
        reserveOZC += amount;
        reserveETH -= ethOut;

        (bool ok,) = msg.sender.call{value: ethOut}("");
        require(ok, "ETH send failed");
        emit Sold(msg.sender, amount, ethOut);
    }

    /// @notice Current price of 1 OZC in ETH (wei).
    function getPrice() external view returns (uint256) {
        if (reserveOZC == 0) return 0;
        return (reserveETH * 1e18) / reserveOZC;
    }
}
