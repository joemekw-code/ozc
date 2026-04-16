// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/OzIndexFinal.sol";
contract DeployFinal is Script {
    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(k);
        OzIndexFinal idx = new OzIndexFinal(0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144);
        vm.stopBroadcast();
        console.log("OzIndexFinal:", address(idx));
    }
}
