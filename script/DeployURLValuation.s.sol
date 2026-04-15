// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/URLValuation.sol";

contract DeployURLValuation is Script {
    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(k);
        URLValuation uv = new URLValuation();
        vm.stopBroadcast();
        console.log("URLValuation:", address(uv));
    }
}
