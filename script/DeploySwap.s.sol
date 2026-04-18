// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/OZCToken.sol";
import "../src/OzMarket.sol";
import "../src/OZCSwap.sol";

contract DeploySwap is Script {
    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(k);
        vm.startBroadcast(k);

        OZCToken token = new OZCToken(100_000_000 * 1e18, deployer);
        OzMarket market = new OzMarket(address(token));
        OZCSwap  swap   = new OZCSwap(address(token));

        // Approve swap for initial liquidity
        token.approve(address(swap), type(uint256).max);

        // Add initial liquidity: 1,000,000 OZC + 1 ETH → 0.000001 ETH/OZC
        swap.addLiquidity{value: 1 ether}(1_000_000 * 1e18);

        vm.stopBroadcast();

        console.log("OZC Token:", address(token));
        console.log("OzMarket: ", address(market));
        console.log("OZCSwap:  ", address(swap));
        console.log("Initial liquidity: 1,000,000 OZC + 1 ETH");
    }
}
