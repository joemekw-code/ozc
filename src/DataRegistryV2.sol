// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BondingCurve} from "./BondingCurve.sol";

interface IRegistryV2Token {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @notice DataRegistry v2: adds 5% creator commission on stakes.
/// Aligns: creators of valuable claims earn from every staker who follows.
contract DataRegistryV2 {
    struct DataEntry {
        bytes32  hash;
        address  creator;
        string   metadata;
        uint256  shareSupply;
        uint256  ozcReserve;
        uint256  capacityBytes;
        bool     exists;
    }

    IRegistryV2Token public immutable ozc;
    uint256 public nextId;

    /// 5% of each stake cost flows directly to the entry's creator.
    uint256 public constant CREATOR_BPS = 500; // 500 / 10000 = 5%
    uint256 public constant BPS_DENOM   = 10000;

    mapping(uint256 => DataEntry) public entries;
    mapping(uint256 => mapping(address => uint256)) public shares;
    mapping(address => uint256) public creatorEarned;

    event Deployed(uint256 indexed id, bytes32 hash, address indexed creator, string metadata);
    event Staked(uint256 indexed id, address indexed staker, uint256 shares, uint256 ozcPaid, uint256 commission);
    event Unstaked(uint256 indexed id, address indexed staker, uint256 shares, uint256 ozcReturned);
    event CommissionPaid(uint256 indexed id, address indexed creator, uint256 amount);

    constructor(address _ozc) {
        ozc = IRegistryV2Token(_ozc);
    }

    function deploy(bytes32 hash, string calldata metadata, uint256 initialShares) external returns (uint256 id) {
        require(initialShares > 0, "must buy at least 1 share");

        uint256 cost = BondingCurve.buyPrice(0, initialShares);
        require(ozc.transferFrom(msg.sender, address(this), cost), "transfer failed");

        id = nextId++;
        entries[id] = DataEntry({
            hash: hash, creator: msg.sender, metadata: metadata,
            shareSupply: initialShares, ozcReserve: cost, capacityBytes: 0, exists: true
        });
        shares[id][msg.sender] = initialShares;

        emit Deployed(id, hash, msg.sender, metadata);
        emit Staked(id, msg.sender, initialShares, cost, 0);
    }

    function stake(uint256 id, uint256 amount) external {
        DataEntry storage e = entries[id];
        require(e.exists, "not found");

        uint256 cost       = BondingCurve.buyPrice(e.shareSupply, amount);
        uint256 commission = (cost * CREATOR_BPS) / BPS_DENOM;
        uint256 toCurve    = cost - commission;

        require(ozc.transferFrom(msg.sender, address(this), cost), "transfer failed");

        if (commission > 0 && msg.sender != e.creator) {
            require(ozc.transfer(e.creator, commission), "commission transfer failed");
            creatorEarned[e.creator] += commission;
            emit CommissionPaid(id, e.creator, commission);
        } else {
            // self-stake: no commission, full cost goes to curve
            toCurve = cost;
        }

        e.shareSupply += amount;
        e.ozcReserve  += toCurve;
        shares[id][msg.sender] += amount;

        emit Staked(id, msg.sender, amount, cost, commission);
    }

    function unstake(uint256 id, uint256 amount) external {
        DataEntry storage e = entries[id];
        require(e.exists, "not found");
        require(shares[id][msg.sender] >= amount, "insufficient shares");

        uint256 proceeds = BondingCurve.sellPrice(e.shareSupply, amount);
        // can't pay more than reserve actually holds
        if (proceeds > e.ozcReserve) proceeds = e.ozcReserve;

        e.shareSupply -= amount;
        e.ozcReserve  -= proceeds;
        shares[id][msg.sender] -= amount;

        require(ozc.transfer(msg.sender, proceeds), "transfer failed");
        emit Unstaked(id, msg.sender, amount, proceeds);
    }

    function marketCap(uint256 id) external view returns (uint256) {
        return entries[id].ozcReserve;
    }

    function currentPrice(uint256 id) external view returns (uint256) {
        return BondingCurve.buyPrice(entries[id].shareSupply, 1);
    }
}
