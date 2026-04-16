// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/OZCToken.sol";
import "../src/OzMarket.sol";

contract DeployLocal is Script {
    function run() external {
        uint256 k = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(k);
        vm.startBroadcast(k);

        OZCToken token = new OZCToken(100_000_000 * 1e18, deployer);
        OzMarket market = new OzMarket(address(token));
        token.approve(address(market), type(uint256).max);

        // test save
        market.save("https://github.com/joemekw-code/ozc", "OZC: decentralized index", 1);

        vm.stopBroadcast();

        console.log("OZC Token:", address(token));
        console.log("OzMarket: ", address(market));
        console.log("Test save: OK");
    }
}
