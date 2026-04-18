// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OZCToken.sol";
import "../src/OZCSwap.sol";

contract OZCSwapTest is Test {
    OZCToken token;
    OZCSwap  swap;

    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    function setUp() public {
        token = new OZCToken(100_000_000 * 1e18, alice);
        swap  = new OZCSwap(address(token));

        // Alice adds liquidity: 1M OZC + 1 ETH
        vm.deal(alice, 10 ether);
        vm.startPrank(alice);
        token.approve(address(swap), type(uint256).max);
        swap.addLiquidity{value: 1 ether}(1_000_000 * 1e18);
        vm.stopPrank();

        // Give Bob some ETH and OZC
        vm.deal(bob, 10 ether);
        vm.prank(alice);
        token.transfer(bob, 100_000 * 1e18);
    }

    function test_initial_reserves() public view {
        assertEq(swap.reserveETH(), 1 ether);
        assertEq(swap.reserveOZC(), 1_000_000 * 1e18);
    }

    function test_getPrice() public view {
        // 1 ETH / 1M OZC = 0.000001 ETH/OZC = 1e12 wei
        uint256 price = swap.getPrice();
        assertEq(price, 1e12);
    }

    function test_buyOZC() public {
        uint256 balBefore = token.balanceOf(bob);

        vm.prank(bob);
        swap.buyOZC{value: 0.1 ether}();

        uint256 balAfter = token.balanceOf(bob);
        uint256 bought = balAfter - balBefore;
        assertTrue(bought > 0, "should receive OZC");

        // Constant product: out = reserveOZC * ethIn / (reserveETH + ethIn)
        // = 1M * 0.1 / 1.1 = ~90909.09 OZC
        uint256 rOZC = 1_000_000 * 1e18;
        uint256 ethIn = 0.1 ether;
        uint256 rETH = 1 ether;
        uint256 expected = (rOZC * ethIn) / (rETH + ethIn);
        assertEq(bought, expected);
    }

    function test_sellOZC() public {
        uint256 ethBefore = bob.balance;

        vm.startPrank(bob);
        token.approve(address(swap), type(uint256).max);
        swap.sellOZC(50_000 * 1e18);
        vm.stopPrank();

        uint256 ethAfter = bob.balance;
        assertTrue(ethAfter > ethBefore, "should receive ETH");
    }

    function test_buy_then_sell_invariant() public {
        // k before
        uint256 k0 = swap.reserveETH() * swap.reserveOZC();

        vm.prank(bob);
        swap.buyOZC{value: 0.5 ether}();

        // k should be >= k0 (rounding can only increase k)
        uint256 k1 = swap.reserveETH() * swap.reserveOZC();
        assertTrue(k1 >= k0, "k should not decrease after buy");

        vm.startPrank(bob);
        token.approve(address(swap), type(uint256).max);
        swap.sellOZC(10_000 * 1e18);
        vm.stopPrank();

        uint256 k2 = swap.reserveETH() * swap.reserveOZC();
        assertTrue(k2 >= k0, "k should not decrease after sell");
    }

    function test_revert_buy_no_liquidity() public {
        OZCSwap empty = new OZCSwap(address(token));
        vm.expectRevert("no liquidity");
        vm.prank(bob);
        empty.buyOZC{value: 1 ether}();
    }
}
