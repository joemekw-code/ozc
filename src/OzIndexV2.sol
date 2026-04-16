// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOZC20 {
    function transferFrom(address, address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @notice Shared decentralized index V2.
/// Requires OZC burn to add entries — prevents index bloat.
/// Fee is dynamic: rises as the index grows. "Fluid minimum."
///
/// ETH commit layer is separate (can use ClaimValuation or URLValuation on the same key).
contract OzIndexV2 {
    IOZC20 public immutable ozc;
    address constant BURN = 0x000000000000000000000000000000000000dEaD;

    // 動的 fee パラメータ
    uint256 public constant BASE_FEE  = 1e18;     // 1 OZC at entry count 0
    uint256 public constant FEE_SLOPE = 1e16;     // +0.01 OZC per existing entry

    struct Entry {
        string   location;     // URL / IPFS / any data address
        string   aiMemo;       // LLM-readable description
        address  contributor;  // who added (and receives ETH commits)
        uint256  ozcBurned;    // how much OZC was burned to index this
        uint256  committedETH; // total ETH committed by others
        bool     exists;
    }

    mapping(bytes32 => Entry) public entries;
    bytes32[] public keys;

    event Added(bytes32 indexed key, string location, address indexed contributor, string aiMemo, uint256 ozcBurned);
    event MemoUpdated(bytes32 indexed key, address indexed by, string aiMemo);
    event Committed(bytes32 indexed key, address indexed committer, address indexed contributor, uint256 amount);

    constructor(address _ozc) {
        ozc = IOZC20(_ozc);
    }

    /// @notice Current fee to add one entry.
    function currentFee() public view returns (uint256) {
        return BASE_FEE + FEE_SLOPE * keys.length;
    }

    function keyOf(string calldata location) public pure returns (bytes32) {
        return keccak256(bytes(location));
    }

    /// @notice Add a data location + AI memo to the shared index.
    /// Caller must have approved this contract for at least currentFee() OZC.
    /// OZC is burned (sent to 0xdead). Fee increases with each entry.
    function add(string calldata location, string calldata aiMemo) external returns (bytes32 key) {
        key = keccak256(bytes(location));
        require(!entries[key].exists, "already indexed");

        uint256 fee = currentFee();
        require(ozc.transferFrom(msg.sender, BURN, fee), "OZC burn failed");

        entries[key] = Entry({
            location: location,
            aiMemo: aiMemo,
            contributor: msg.sender,
            ozcBurned: fee,
            committedETH: 0,
            exists: true
        });
        keys.push(key);
        emit Added(key, location, msg.sender, aiMemo, fee);
    }

    /// @notice Update AI memo (collaborative refinement).
    function updateMemo(bytes32 key, string calldata aiMemo) external {
        require(entries[key].exists, "not indexed");
        entries[key].aiMemo = aiMemo;
        emit MemoUpdated(key, msg.sender, aiMemo);
    }

    /// @notice Commit ETH to an indexed entry. Forwards to contributor.
    function commit(bytes32 key) external payable {
        require(msg.value > 0, "zero");
        Entry storage e = entries[key];
        require(e.exists, "not indexed");
        e.committedETH += msg.value;
        (bool ok, ) = e.contributor.call{value: msg.value}("");
        require(ok, "transfer failed");
        emit Committed(key, msg.sender, e.contributor, msg.value);
    }

    function count() external view returns (uint256) { return keys.length; }

    function range(uint256 start, uint256 end_) external view returns (Entry[] memory out) {
        if (end_ > keys.length) end_ = keys.length;
        require(start <= end_, "bad range");
        out = new Entry[](end_ - start);
        for (uint256 i = start; i < end_; i++) out[i - start] = entries[keys[i]];
    }

    /// @notice Total OZC burned across all entries.
    function totalBurned() external view returns (uint256 total) {
        for (uint256 i = 0; i < keys.length; i++) total += entries[keys[i]].ozcBurned;
    }
}
