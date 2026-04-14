// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DataRegistryV2.sol";
import "../src/OZCFaucet.sol";

interface IOZC {
    function transfer(address, uint256) external returns (bool);
}

contract DeployV2 is Script {
    address constant OZC_TOKEN = 0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        DataRegistryV2 registry = new DataRegistryV2(OZC_TOKEN);
        OZCFaucet      faucet   = new OZCFaucet(OZC_TOKEN);

        // Fund faucet with 10M OZC (enough for 100,000 new users at 100 OZC each)
        IOZC(OZC_TOKEN).transfer(address(faucet), 10_000_000 * 1e18);

        vm.stopBroadcast();

        console.log("DataRegistryV2:", address(registry));
        console.log("OZCFaucet     :", address(faucet));
    }
}
