// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OzIndex.sol";

contract DeployIndex is Script {
    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(k);
        OzIndex idx = new OzIndex();
        vm.stopBroadcast();
        console.log("OzIndex:", address(idx));
    }
}
