// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SponsoredFaucet.sol";

interface IOZC { function transfer(address, uint256) external returns (bool); }

contract DeploySponsored is Script {
    address constant OZC_TOKEN = 0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144;

    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(k);
        SponsoredFaucet f = new SponsoredFaucet(OZC_TOKEN);
        IOZC(OZC_TOKEN).transfer(address(f), 10_000_000 * 1e18);
        vm.stopBroadcast();
        console.log("SponsoredFaucet:", address(f));
    }
}
