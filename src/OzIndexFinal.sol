// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFinalToken {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @notice OzIndex — 最終形
///
/// 情報の共通台帳。誰でも同じものが見える。
///
/// 1. add(location, aiMemo) → OZC lock して entry 作成（動的 fee）
/// 2. back(key, amount) → その情報に OZC をかける。誰でも。何度でも。
///    OZC は contract にロックされ、誰にも渡らない。配当なし。
/// 3. unback(key, amount) → かけた OZC を引き出す。いつでも。
/// 4. list / buyListing / transfer → slot 所有権の売買
/// 5. remove → entry 削除、slot lock OZC 返却
///
/// totalBacked(key) = その情報に人がつけた値段。勝手に。
contract OzIndexFinal {
    IFinalToken public immutable ozc;

    uint256 public constant BASE_FEE  = 1e18;
    uint256 public constant FEE_SLOPE = 1e16;

    struct Entry {
        string   location;
        string   aiMemo;
        address  owner;
        uint256  lockedOZC;      // slot creation lock
        uint256  totalBacked;    // sum of all OZC backed by anyone
        uint256  listPriceOZC;
        bool     exists;
    }

    mapping(bytes32 => Entry) public entries;
    mapping(bytes32 => mapping(address => uint256)) public backedBy; // key => backer => amount
    bytes32[] public keys;
    uint256 public activeCount;

    event Added(bytes32 indexed key, string location, address indexed owner, string aiMemo, uint256 ozcLocked);
    event Backed(bytes32 indexed key, address indexed backer, uint256 amount);
    event Unbacked(bytes32 indexed key, address indexed backer, uint256 amount);
    event Listed(bytes32 indexed key, uint256 priceOZC);
    event Sold(bytes32 indexed key, address indexed seller, address indexed buyer, uint256 priceOZC);
    event Transferred(bytes32 indexed key, address indexed from, address indexed to);
    event Removed(bytes32 indexed key, address indexed owner, uint256 ozcReturned);
    event MemoUpdated(bytes32 indexed key, address indexed by, string aiMemo);

    constructor(address _ozc) { ozc = IFinalToken(_ozc); }

    function currentFee() public view returns (uint256) {
        return BASE_FEE + FEE_SLOPE * activeCount;
    }

    function keyOf(string calldata location) public pure returns (bytes32) {
        return keccak256(bytes(location));
    }

    // ── add / remove ──

    function add(string calldata location, string calldata aiMemo) external returns (bytes32 key) {
        key = keccak256(bytes(location));
        require(!entries[key].exists, "exists");
        uint256 fee = currentFee();
        require(ozc.transferFrom(msg.sender, address(this), fee), "lock failed");
        entries[key] = Entry(location, aiMemo, msg.sender, fee, 0, 0, true);
        keys.push(key);
        activeCount++;
        emit Added(key, location, msg.sender, aiMemo, fee);
    }

    function remove(bytes32 key) external {
        Entry storage e = entries[key];
        require(e.exists && e.owner == msg.sender, "not owner");
        require(e.totalBacked == 0, "has backers");
        uint256 refund = e.lockedOZC;
        e.exists = false;
        e.lockedOZC = 0;
        activeCount--;
        require(ozc.transfer(msg.sender, refund), "refund failed");
        emit Removed(key, msg.sender, refund);
    }

    // ── back / unback — 情報に値段をつけるだけ。配当なし。 ──

    function back(bytes32 key, uint256 amount) external {
        require(entries[key].exists, "not found");
        require(amount > 0, "zero");
        require(ozc.transferFrom(msg.sender, address(this), amount), "transfer failed");
        backedBy[key][msg.sender] += amount;
        entries[key].totalBacked  += amount;
        emit Backed(key, msg.sender, amount);
    }

    function unback(bytes32 key, uint256 amount) external {
        require(backedBy[key][msg.sender] >= amount, "insufficient");
        backedBy[key][msg.sender] -= amount;
        entries[key].totalBacked  -= amount;
        require(ozc.transfer(msg.sender, amount), "withdraw failed");
        emit Unbacked(key, msg.sender, amount);
    }

    // ── slot 売買 ──

    function list(bytes32 key, uint256 priceOZC) external {
        Entry storage e = entries[key];
        require(e.exists && e.owner == msg.sender, "not owner");
        e.listPriceOZC = priceOZC;
        emit Listed(key, priceOZC);
    }

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

    function transfer(bytes32 key, address to) external {
        Entry storage e = entries[key];
        require(e.exists && e.owner == msg.sender, "not owner");
        e.owner = to;
        e.listPriceOZC = 0;
        emit Transferred(key, msg.sender, to);
    }

    function updateMemo(bytes32 key, string calldata aiMemo) external {
        require(entries[key].exists, "not found");
        entries[key].aiMemo = aiMemo;
        emit MemoUpdated(key, msg.sender, aiMemo);
    }

    // ── read ──

    function count() external view returns (uint256) { return keys.length; }

    function range(uint256 start, uint256 end_) external view returns (Entry[] memory out) {
        if (end_ > keys.length) end_ = keys.length;
        out = new Entry[](end_ - start);
        for (uint256 i = start; i < end_; i++) out[i - start] = entries[keys[i]];
    }
}
