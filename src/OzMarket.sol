// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOzToken {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @notice OzMarket — 全て OZC 建て。ETH 不要（ガス以外）。
///
/// 情報を save → OZC で share 購入（bonding curve）
/// 後から同じ情報に save する人は高い → 先行者が得
/// sell でいつでも OZC 回収（curve 価格で）
///
/// slot 管理 + bonding curve + AI memo を1契約に統合。
contract OzMarket {
    IOzToken public immutable ozc;

    uint256 public constant BASE  = 1e15;   // 0.001 OZC per share at supply=0
    uint256 public constant SLOPE = 1e12;   // price increment per share

    struct Entry {
        string   location;
        string   aiMemo;
        address  firstSaver;      // 最初に save した人
        uint256  shareSupply;
        uint256  ozcReserve;      // curve に lock されている OZC 総量
        bool     exists;
    }

    mapping(bytes32 => Entry) public entries;
    mapping(bytes32 => mapping(address => uint256)) public sharesOf;
    bytes32[] public keys;

    event Saved(bytes32 indexed key, string location, address indexed saver, uint256 shares, uint256 ozcPaid, string aiMemo);
    event Sold(bytes32 indexed key, address indexed seller, uint256 shares, uint256 ozcReturned);

    constructor(address _ozc) { ozc = IOzToken(_ozc); }

    function _buyCost(uint256 supply, uint256 n) internal pure returns (uint256) {
        return n * BASE + SLOPE * (supply * n + (n * (n - 1)) / 2);
    }
    function _sellProceeds(uint256 supply, uint256 n) internal pure returns (uint256) {
        uint256 ns = supply - n;
        return n * BASE + SLOPE * (ns * n + (n * (n - 1)) / 2);
    }

    function keyOf(string calldata location) public pure returns (bytes32) {
        return keccak256(bytes(location));
    }

    /// @notice Save: index に追加（初回のみ） + bonding curve で shares 購入
    function save(string calldata location, string calldata aiMemo, uint256 shares) external {
        require(shares > 0, "zero");
        bytes32 key = keccak256(bytes(location));

        if (!entries[key].exists) {
            entries[key] = Entry(location, aiMemo, msg.sender, 0, 0, true);
            keys.push(key);
            emit Saved(key, location, msg.sender, 0, 0, aiMemo);
        }

        Entry storage e = entries[key];
        uint256 cost = _buyCost(e.shareSupply, shares);
        require(ozc.transferFrom(msg.sender, address(this), cost), "OZC transfer failed");

        e.shareSupply += shares;
        e.ozcReserve  += cost;
        sharesOf[key][msg.sender] += shares;

        emit Saved(key, location, msg.sender, shares, cost, aiMemo);
    }

    /// @notice Sell shares back to curve. Get OZC at current price.
    function sell(bytes32 key, uint256 shares) external {
        Entry storage e = entries[key];
        require(e.exists, "not found");
        require(sharesOf[key][msg.sender] >= shares, "insufficient");

        uint256 proceeds = _sellProceeds(e.shareSupply, shares);
        if (proceeds > e.ozcReserve) proceeds = e.ozcReserve;

        e.shareSupply -= shares;
        e.ozcReserve  -= proceeds;
        sharesOf[key][msg.sender] -= shares;

        require(ozc.transfer(msg.sender, proceeds), "OZC return failed");
        emit Sold(key, msg.sender, shares, proceeds);
    }

    function updateMemo(bytes32 key, string calldata aiMemo) external {
        require(entries[key].exists, "not found");
        entries[key].aiMemo = aiMemo;
    }

    // ── read ──
    function price(bytes32 key) external view returns (uint256) {
        return _buyCost(entries[key].shareSupply, 1);
    }
    function count() external view returns (uint256) { return keys.length; }
    function range(uint256 s, uint256 e_) external view returns (Entry[] memory out) {
        if (e_ > keys.length) e_ = keys.length;
        out = new Entry[](e_ - s);
        for (uint256 i = s; i < e_; i++) out[i - s] = entries[keys[i]];
    }
}
