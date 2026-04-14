// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OZCToken.sol";
import "../src/DataRegistry.sol";
import "../src/CapacityMarket.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 100M OZC, 18 decimals
        OZCToken token = new OZCToken(100_000_000 * 1e18, deployer);

        DataRegistry registry = new DataRegistry(address(token));

        CapacityMarket capacity = new CapacityMarket(address(token), address(registry));

        vm.stopBroadcast();

        console.log("OZCToken      :", address(token));
        console.log("DataRegistry  :", address(registry));
        console.log("CapacityMarket:", address(capacity));
    }
}
