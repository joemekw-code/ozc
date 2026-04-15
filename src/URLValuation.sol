// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice URL-level (or any identifier-level) valuation.
/// Anyone can commit ETH to any identifier on the internet (URL, hash, document ID).
/// Later committers face a higher price than earlier ones. Positions can be released at the current price.
/// The single legible metric per identifier: reserve[urlHash] (total ETH currently held against this info).
contract URLValuation {
    // linear bonding curve: price(n) = BASE + SLOPE * n
    uint256 public constant BASE  = 1e12;    // 0.000001 ETH per share at supply=0
    uint256 public constant SLOPE = 1e10;    // tiny gradient

    mapping(bytes32 => uint256) public shareSupply;   // id => total shares outstanding
    mapping(bytes32 => uint256) public reserve;       // id => total ETH locked
    mapping(bytes32 => mapping(address => uint256)) public sharesOf; // id => user => shares

    event Committed(bytes32 indexed id, address indexed committer, uint256 shares, uint256 ethPaid);
    event Released (bytes32 indexed id, address indexed committer, uint256 shares, uint256 ethReturned);
    event Registered(bytes32 indexed id, string identifier);

    /// @notice Register a human-readable identifier (optional). Useful to log the URL/hash source.
    function register(string calldata identifier) external returns (bytes32 id) {
        id = keccak256(bytes(identifier));
        emit Registered(id, identifier);
    }

    function _buyCost(uint256 supply, uint256 n) internal pure returns (uint256) {
        // sum of price(supply)..price(supply+n-1)
        return n * BASE + SLOPE * (supply * n + (n * (n - 1)) / 2);
    }
    function _sellProceeds(uint256 supply, uint256 n) internal pure returns (uint256) {
        require(supply >= n, "undersupply");
        uint256 newSupply = supply - n;
        return n * BASE + SLOPE * (newSupply * n + (n * (n - 1)) / 2);
    }

    function buy(bytes32 id, uint256 n) external payable {
        require(n > 0, "zero shares");
        uint256 cost = _buyCost(shareSupply[id], n);
        require(msg.value >= cost, "insufficient ETH");
        shareSupply[id]       += n;
        reserve[id]           += cost;
        sharesOf[id][msg.sender] += n;
        emit Committed(id, msg.sender, n, cost);
        if (msg.value > cost) {
            (bool ok, ) = msg.sender.call{value: msg.value - cost}("");
            require(ok, "refund failed");
        }
    }

    function sell(bytes32 id, uint256 n) external {
        require(n > 0, "zero shares");
        require(sharesOf[id][msg.sender] >= n, "insufficient");
        uint256 proceeds = _sellProceeds(shareSupply[id], n);
        shareSupply[id]       -= n;
        reserve[id]           -= proceeds;
        sharesOf[id][msg.sender] -= n;
        (bool ok, ) = msg.sender.call{value: proceeds}("");
        require(ok, "payout failed");
        emit Released(id, msg.sender, n, proceeds);
    }

    /// @notice Convenience: buy by providing a string identifier directly.
    function buyByString(string calldata identifier, uint256 n) external payable {
        bytes32 id = keccak256(bytes(identifier));
        // inline buy to avoid re-entry
        require(n > 0, "zero");
        uint256 cost = _buyCost(shareSupply[id], n);
        require(msg.value >= cost, "insufficient ETH");
        shareSupply[id]       += n;
        reserve[id]           += cost;
        sharesOf[id][msg.sender] += n;
        emit Registered(id, identifier);
        emit Committed(id, msg.sender, n, cost);
        if (msg.value > cost) {
            (bool ok, ) = msg.sender.call{value: msg.value - cost}("");
            require(ok, "refund failed");
        }
    }

    function buyPriceNext(bytes32 id) external view returns (uint256) {
        return _buyCost(shareSupply[id], 1);
    }
    function sellPriceOne(bytes32 id) external view returns (uint256) {
        return _sellProceeds(shareSupply[id], 1);
    }
}
