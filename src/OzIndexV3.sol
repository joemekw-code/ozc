// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IV3Token {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @notice Shared decentralized index V3.
/// OZC is LOCKED (not burned) when adding entries. The locked position is a tradeable asset.
///   - Fee is dynamic (rises with index size)
///   - Owner can sell the slot (list + buy) or transfer
///   - Owner can remove → get locked OZC back
///   - ETH can be committed to any entry (goes to owner)
///
/// 情報を載せるのにお金がかかり、その権利自体が流動する。
contract OzIndexV3 {
    IV3Token public immutable ozc;

    uint256 public constant BASE_FEE  = 1e18;     // 1 OZC at count=0
    uint256 public constant FEE_SLOPE = 1e16;     // +0.01 OZC per entry

    struct Entry {
        string   location;
        string   aiMemo;
        address  owner;          // current owner (receives ETH commits, can sell/remove)
        uint256  lockedOZC;      // OZC locked when this slot was created
        uint256  committedETH;
        uint256  listPriceOZC;   // 0 = not listed; >0 = for sale at this OZC price
        bool     exists;
    }

    mapping(bytes32 => Entry) public entries;
    bytes32[] public keys;
    uint256 public activeCount;  // entries currently active (not removed)

    event Added(bytes32 indexed key, string location, address indexed owner, string aiMemo, uint256 ozcLocked);
    event Removed(bytes32 indexed key, address indexed owner, uint256 ozcReturned);
    event Listed(bytes32 indexed key, address indexed owner, uint256 priceOZC);
    event Sold(bytes32 indexed key, address indexed seller, address indexed buyer, uint256 priceOZC);
    event Transferred(bytes32 indexed key, address indexed from, address indexed to);
    event MemoUpdated(bytes32 indexed key, address indexed by, string aiMemo);
    event Committed(bytes32 indexed key, address indexed committer, address indexed owner, uint256 ethAmount);

    constructor(address _ozc) { ozc = IV3Token(_ozc); }

    function currentFee() public view returns (uint256) {
        return BASE_FEE + FEE_SLOPE * activeCount;
    }

    function keyOf(string calldata location) public pure returns (bytes32) {
        return keccak256(bytes(location));
    }

    /// @notice Index a data location. Locks OZC at dynamic fee. You become the slot owner.
    function add(string calldata location, string calldata aiMemo) external returns (bytes32 key) {
        key = keccak256(bytes(location));
        require(!entries[key].exists, "already indexed");
        uint256 fee = currentFee();
        require(ozc.transferFrom(msg.sender, address(this), fee), "OZC lock failed");
        entries[key] = Entry({
            location: location, aiMemo: aiMemo, owner: msg.sender,
            lockedOZC: fee, committedETH: 0, listPriceOZC: 0, exists: true
        });
        keys.push(key);
        activeCount++;
        emit Added(key, location, msg.sender, aiMemo, fee);
    }

    /// @notice Remove your entry. Get your locked OZC back.
    function remove(bytes32 key) external {
        Entry storage e = entries[key];
        require(e.exists && e.owner == msg.sender, "not owner");
        uint256 refund = e.lockedOZC;
        e.exists = false;
        e.lockedOZC = 0;
        e.listPriceOZC = 0;
        activeCount--;
        require(ozc.transfer(msg.sender, refund), "refund failed");
        emit Removed(key, msg.sender, refund);
    }

    /// @notice List your slot for sale at a price in OZC.
    function list(bytes32 key, uint256 priceOZC) external {
        Entry storage e = entries[key];
        require(e.exists && e.owner == msg.sender, "not owner");
        e.listPriceOZC = priceOZC;
        emit Listed(key, msg.sender, priceOZC);
    }

    /// @notice Buy a listed slot. Pays OZC to seller. Ownership + locked OZC transfers.
    function buyListing(bytes32 key) external {
        Entry storage e = entries[key];
        require(e.exists && e.listPriceOZC > 0, "not for sale");
        uint256 price = e.listPriceOZC;
        address seller = e.owner;
        require(ozc.transferFrom(msg.sender, seller, price), "payment failed");
        e.owner = msg.sender;
        e.listPriceOZC = 0;
        emit Sold(key, seller, msg.sender, price);
    }

    /// @notice Direct transfer (no payment through contract, p2p negotiation).
    function transfer(bytes32 key, address newOwner) external {
        Entry storage e = entries[key];
        require(e.exists && e.owner == msg.sender, "not owner");
        e.owner = newOwner;
        e.listPriceOZC = 0;
        emit Transferred(key, msg.sender, newOwner);
    }

    function updateMemo(bytes32 key, string calldata aiMemo) external {
        require(entries[key].exists, "not found");
        entries[key].aiMemo = aiMemo;
        emit MemoUpdated(key, msg.sender, aiMemo);
    }

    function commit(bytes32 key) external payable {
        require(msg.value > 0, "zero");
        Entry storage e = entries[key];
        require(e.exists, "not found");
        e.committedETH += msg.value;
        (bool ok, ) = e.owner.call{value: msg.value}("");
        require(ok, "transfer failed");
        emit Committed(key, msg.sender, e.owner, msg.value);
    }

    function count() external view returns (uint256) { return keys.length; }

    function range(uint256 start, uint256 end_) external view returns (Entry[] memory out) {
        if (end_ > keys.length) end_ = keys.length;
        out = new Entry[](end_ - start);
        for (uint256 i = start; i < end_; i++) out[i - start] = entries[keys[i]];
    }

    /// @notice Total OZC currently locked in all active entries.
    function totalLocked() external view returns (uint256 total) {
        for (uint256 i = 0; i < keys.length; i++) total += entries[keys[i]].lockedOZC;
    }
}
