// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ClaimValuation.sol";

contract DeployValuation is Script {
    address constant REGISTRY_V2 = 0x3cA993e7183824e11B2A65CF183b4c3521BF4754;

    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(k);
        ClaimValuation cv = new ClaimValuation(REGISTRY_V2);
        vm.stopBroadcast();
        console.log("ClaimValuation:", address(cv));
    }
}
