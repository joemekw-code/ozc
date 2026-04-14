// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFaucetToken {
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @notice One-time 100 OZC grant per new address. Bootstraps participation.
contract OZCFaucet {
    IFaucetToken public immutable ozc;
    uint256      public constant GRANT = 100 * 1e18;
    mapping(address => bool) public claimed;

    event Claimed(address indexed to, uint256 amount);

    constructor(address _ozc) {
        ozc = IFaucetToken(_ozc);
    }

    function claim() external {
        require(!claimed[msg.sender], "already claimed");
        require(ozc.balanceOf(address(this)) >= GRANT, "faucet empty");
        claimed[msg.sender] = true;
        require(ozc.transfer(msg.sender, GRANT), "transfer failed");
        emit Claimed(msg.sender, GRANT);
    }

    function remaining() external view returns (uint256) {
        return ozc.balanceOf(address(this));
    }
}
