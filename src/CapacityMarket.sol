// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICapacityToken {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

/// @notice Phase 2: network capacity rights issuance and secondary trading.
/// Capacity is issued when data is deployed; rights can be listed and sold.
contract CapacityMarket {
    struct Listing {
        address seller;
        uint256 capacityBytes;
        uint256 priceOZC;
        bool    active;
    }

    ICapacityToken public immutable ozc;
    address public immutable registry;

    mapping(address => uint256) public capacityOf; // agent => bytes available
    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    event CapacityIssued(address indexed to, uint256 bytes_);
    event Listed(uint256 indexed listingId, address indexed seller, uint256 bytes_, uint256 price);
    event Sold(uint256 indexed listingId, address indexed buyer, uint256 bytes_, uint256 price);

    constructor(address _ozc, address _registry) {
        ozc = ICapacityToken(_ozc);
        registry = _registry;
    }

    /// @notice Called by DataRegistry on deploy to issue capacity rights.
    function issue(address to, uint256 bytes_) external {
        require(msg.sender == registry, "only registry");
        capacityOf[to] += bytes_;
        emit CapacityIssued(to, bytes_);
    }

    /// @notice List capacity for sale.
    function list(uint256 bytes_, uint256 priceOZC) external returns (uint256 listingId) {
        require(capacityOf[msg.sender] >= bytes_, "insufficient capacity");
        capacityOf[msg.sender] -= bytes_;

        listingId = nextListingId++;
        listings[listingId] = Listing({
            seller:        msg.sender,
            capacityBytes: bytes_,
            priceOZC:      priceOZC,
            active:        true
        });

        emit Listed(listingId, msg.sender, bytes_, priceOZC);
    }

    /// @notice Buy listed capacity.
    function buy(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.active, "not active");
        l.active = false;

        require(ozc.transferFrom(msg.sender, l.seller, l.priceOZC), "payment failed");
        capacityOf[msg.sender] += l.capacityBytes;

        emit Sold(listingId, msg.sender, l.capacityBytes, l.priceOZC);
    }

    /// @notice Cancel a listing and reclaim capacity.
    function cancel(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender && l.active, "not yours");
        l.active = false;
        capacityOf[msg.sender] += l.capacityBytes;
    }
}
