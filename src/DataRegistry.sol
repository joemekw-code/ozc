// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BondingCurve} from "./BondingCurve.sol";

interface IERC20 {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @notice Core registry: deploy data, stake/unstake OZC via bonding curve.
contract DataRegistry {
    struct DataEntry {
        bytes32  hash;          // keccak256 of the data
        address  creator;
        string   metadata;      // JSON: title, description, dataURI
        uint256  shareSupply;   // total shares outstanding
        uint256  ozcReserve;    // OZC locked in this entry's curve
        uint256  capacityBytes; // network capacity allocated (Phase 2)
        bool     exists;
    }

    IERC20 public immutable ozc;
    uint256 public nextId;

    mapping(uint256 => DataEntry) public entries;
    mapping(uint256 => mapping(address => uint256)) public shares; // entryId => holder => shares

    event Deployed(uint256 indexed id, bytes32 hash, address indexed creator, string metadata);
    event Staked(uint256 indexed id, address indexed staker, uint256 shares, uint256 ozcPaid);
    event Unstaked(uint256 indexed id, address indexed staker, uint256 shares, uint256 ozcReturned);

    constructor(address _ozc) {
        ozc = IERC20(_ozc);
    }

    /// @notice Deploy a data entry and buy the first share.
    function deploy(bytes32 hash, string calldata metadata, uint256 initialShares) external returns (uint256 id) {
        require(initialShares > 0, "must buy at least 1 share");

        uint256 cost = BondingCurve.buyPrice(0, initialShares);
        require(ozc.transferFrom(msg.sender, address(this), cost), "transfer failed");

        id = nextId++;
        entries[id] = DataEntry({
            hash:          hash,
            creator:       msg.sender,
            metadata:      metadata,
            shareSupply:   initialShares,
            ozcReserve:    cost,
            capacityBytes: 0,
            exists:        true
        });
        shares[id][msg.sender] = initialShares;

        emit Deployed(id, hash, msg.sender, metadata);
        emit Staked(id, msg.sender, initialShares, cost);
    }

    /// @notice Buy shares of an existing data entry.
    function stake(uint256 id, uint256 amount) external {
        DataEntry storage e = entries[id];
        require(e.exists, "not found");

        uint256 cost = BondingCurve.buyPrice(e.shareSupply, amount);
        require(ozc.transferFrom(msg.sender, address(this), cost), "transfer failed");

        e.shareSupply += amount;
        e.ozcReserve  += cost;
        shares[id][msg.sender] += amount;

        emit Staked(id, msg.sender, amount, cost);
    }

    /// @notice Sell shares back to the curve.
    function unstake(uint256 id, uint256 amount) external {
        DataEntry storage e = entries[id];
        require(e.exists, "not found");
        require(shares[id][msg.sender] >= amount, "insufficient shares");

        uint256 proceeds = BondingCurve.sellPrice(e.shareSupply, amount);

        e.shareSupply -= amount;
        e.ozcReserve  -= proceeds;
        shares[id][msg.sender] -= amount;

        require(ozc.transfer(msg.sender, proceeds), "transfer failed");

        emit Unstaked(id, msg.sender, amount, proceeds);
    }

    /// @notice Read market cap of an entry (OZC reserve = implicit market cap).
    function marketCap(uint256 id) external view returns (uint256) {
        return entries[id].ozcReserve;
    }

    /// @notice Price to buy next 1 share.
    function currentPrice(uint256 id) external view returns (uint256) {
        return BondingCurve.buyPrice(entries[id].shareSupply, 1);
    }
}
