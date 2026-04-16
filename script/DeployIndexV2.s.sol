// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OzIndexV2.sol";

contract DeployIndexV2 is Script {
    address constant OZC_TOKEN = 0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144;

    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(k);
        OzIndexV2 idx = new OzIndexV2(OZC_TOKEN);
        vm.stopBroadcast();
        console.log("OzIndexV2:", address(idx));
    }
}
