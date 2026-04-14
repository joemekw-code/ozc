// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OZCToken.sol";
import "../src/DataRegistry.sol";
import "../src/BondingCurve.sol";

contract OZCTest is Test {
    OZCToken    token;
    DataRegistry registry;

    address alice = address(0xA);
    address bob   = address(0xB);

    uint256 constant INITIAL = 100_000_000 * 1e18; // 100M OZC

    function setUp() public {
        registry = new DataRegistry(address(0)); // placeholder, replaced below
        token    = new OZCToken(INITIAL, alice);
        registry = new DataRegistry(address(token));

        vm.prank(alice);
        token.approve(address(registry), type(uint256).max);

        vm.prank(bob);
        token.approve(address(registry), type(uint256).max);
    }

    function test_deploy_and_stake() public {
        bytes32 hash = keccak256("my data");
        string memory meta = '{"title":"test","description":"hello"}';

        vm.prank(alice);
        uint256 id = registry.deploy(hash, meta, 1);

        assertEq(registry.currentPrice(id), BondingCurve.buyPrice(1, 1));

        // Bob stakes
        vm.prank(alice);
        token.transfer(bob, 1e18);

        uint256 cost = registry.currentPrice(id);
        vm.prank(bob);
        registry.stake(id, 1);

        assertEq(registry.shares(id, bob), 1);
        assertTrue(registry.marketCap(id) > 0);
    }

    function test_unstake_earns_profit() public {
        // alice deploys with 1 share
        vm.prank(alice);
        uint256 id = registry.deploy(keccak256("data"), "{}", 1);

        // transfer to bob and let him stake 10 shares (drives price up)
        vm.prank(alice);
        token.transfer(bob, 10e18);

        uint256 aliceBalBefore = token.balanceOf(alice);

        vm.prank(bob);
        registry.stake(id, 10);

        // alice unstakes her 1 share at elevated price
        uint256 aliceShares = registry.shares(id, alice);
        vm.prank(alice);
        registry.unstake(id, aliceShares);

        uint256 aliceBalAfter = token.balanceOf(alice);
        assertTrue(aliceBalAfter > aliceBalBefore, "alice should profit");
    }

    function test_no_follower_price_stays_low() public {
        vm.prank(alice);
        uint256 id = registry.deploy(keccak256("noise"), "{}", 1);

        uint256 price = registry.currentPrice(id);
        // With supply=1, nobody following, price should be very low
        assertTrue(price < 1e15 * 3, "price should stay near base");
    }
}
