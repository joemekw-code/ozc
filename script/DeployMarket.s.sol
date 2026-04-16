// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/OzMarket.sol";
contract DeployMarket is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        OzMarket m = new OzMarket(0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144);
        vm.stopBroadcast();
        console.log("OzMarket:", address(m));
    }
}
