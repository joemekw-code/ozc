// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Shared decentralized index. Everyone holds the same view.
/// Each entry records:
///   - location: where the data is (URL / IPFS / any identifier)
///   - aiMemo:   LLM-readable description — lets an AI decide whether to fetch
///   - contributor: who added the entry (receives ETH commits)
///
/// LLMs consume this index directly to find and interpret data sources,
/// bypassing crawler-based centralized rankings.
///
/// Anyone can commit ETH to an entry; ETH forwards to the original contributor.
contract OzIndex {
    struct Entry {
        string   location;
        string   aiMemo;
        address  contributor;
        uint256  committedETH;
        bool     exists;
    }

    mapping(bytes32 => Entry) public entries;   // key = keccak256(location)
    bytes32[] public keys;                      // enumerate-all, small-scale OK

    event Added(bytes32 indexed key, string location, address indexed contributor, string aiMemo);
    event MemoUpdated(bytes32 indexed key, address indexed by, string aiMemo);
    event Committed(bytes32 indexed key, address indexed committer, address indexed contributor, uint256 amount);

    function keyOf(string calldata location) public pure returns (bytes32) {
        return keccak256(bytes(location));
    }

    function add(string calldata location, string calldata aiMemo) external returns (bytes32 key) {
        key = keccak256(bytes(location));
        require(!entries[key].exists, "already indexed");
        entries[key] = Entry({
            location: location, aiMemo: aiMemo,
            contributor: msg.sender, committedETH: 0, exists: true
        });
        keys.push(key);
        emit Added(key, location, msg.sender, aiMemo);
    }

    /// @notice Anyone can append additional memos. Updates the memo field.
    /// The original contributor stays; memo refinement is collaborative.
    function updateMemo(bytes32 key, string calldata aiMemo) external {
        require(entries[key].exists, "not indexed");
        entries[key].aiMemo = aiMemo;
        emit MemoUpdated(key, msg.sender, aiMemo);
    }

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

    function range(uint256 start, uint256 end) external view returns (Entry[] memory out) {
        if (end > keys.length) end = keys.length;
        require(start <= end, "bad range");
        out = new Entry[](end - start);
        for (uint256 i = start; i < end; i++) out[i - start] = entries[keys[i]];
    }
}
