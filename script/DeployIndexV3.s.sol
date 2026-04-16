// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OzIndexV3.sol";

contract DeployIndexV3 is Script {
    address constant OZC_TOKEN = 0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144;
    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(k);
        OzIndexV3 idx = new OzIndexV3(OZC_TOKEN);
        vm.stopBroadcast();
        console.log("OzIndexV3:", address(idx));
    }
}
