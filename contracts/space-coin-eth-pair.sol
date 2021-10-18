// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "hardhat/console.sol";
import "./space-coin.sol";

contract SpaceCoinEthPair is Ownable, ERC20, Pausable {
    uint256 public constant MINIMUM_LIQUIDITY = 10;
    address public spaceCoinAddress;
    uint256 public spaceCoinReserves;
    uint256 public ethReserves;
    uint256 public ethPriceLast;
    uint256 public spaceCoinPriceLast;
    uint256 public kLast;
    uint256 public feePercent;
    mapping(address => bool) public routerAddresses;

    modifier onlyRouters() {
        require(routerAddresses[msg.sender], "ACCESS_DENIED_ROUTER_ONLY");
        _;
    }

    modifier onlySpaceCoin() {
        require(msg.sender == spaceCoinAddress, "ACCESS_DENIED_SPC_ONLY");
        _;
    }

    constructor(address _spaceCoinAddress) Ownable() ERC20("Space-ETH", "SPC-ETH") Pausable() {
        spaceCoinAddress = _spaceCoinAddress;
        feePercent = 1;
    }

    function setSpaceCoinAddress(address _address) external onlyOwner {
        spaceCoinAddress = _address;
    }

    function setRouterAddresses(address _address, bool _bool) external onlyOwner {
        routerAddresses[_address] = _bool;
    }

    function updateReserves() private {
        spaceCoinReserves = IERC20(spaceCoinAddress).balanceOf(address(this));
        // How to check if this has failed maybe val > 0
        ethReserves = address(this).balance;
    }

    // Only called by router
    // Only called right after the transfer of spaceCoin
    function mint(address _to) external whenNotPaused returns (uint256 liquidity) {
        uint256 spaceCoinBalance = IERC20(spaceCoinAddress).balanceOf(address(this));
        uint256 ethBalance = address(this).balance;
        uint256 amountSpaceCoin = spaceCoinBalance - spaceCoinReserves;
        uint256 amountEth = ethBalance - ethReserves;
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = sqrt(amountSpaceCoin * amountEth);
        } else {
            uint256 optimisticAmountEth = (amountEth * totalSupply()) / ethReserves;
            uint256 optimisticAmountSpaceCoin = (amountSpaceCoin * totalSupply()) / spaceCoinReserves;
            liquidity = optimisticAmountEth < optimisticAmountSpaceCoin
                ? optimisticAmountEth
                : optimisticAmountSpaceCoin;
        }
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY");
        _mint(_to, liquidity);
        updateReserves();
    }

    function burn(address _to) external whenNotPaused returns (uint256 amountSpaceCoin, uint256 amountEth) {
        uint256 _totalSupply = totalSupply();
        uint256 currentLiquidity = balanceOf(address(this));
        amountSpaceCoin = (currentLiquidity * spaceCoinReserves) / _totalSupply;
        amountEth = (currentLiquidity * ethReserves) / _totalSupply;
        _burn(address(this), currentLiquidity);
        bool sentSPC = SpaceCoin(spaceCoinAddress).transfer(_to, amountSpaceCoin);
        require(sentSPC, "SPC_TRANSFER_FAILED");
        (bool sent, ) = _to.call{ value: amountEth }("");
        require(sent, "ETH_TRANSFER_FAILED");
        updateReserves();
    }

    function swap(address _to) external payable returns (uint256 amountSwapped) {
        uint256 amountSpaceCoin = SpaceCoin(spaceCoinAddress).balanceOf(address(this)) - spaceCoinReserves;
        uint256 amountEth = address(this).balance - ethReserves;
        uint256 k = spaceCoinReserves * ethReserves;
        require(amountSpaceCoin > 0 || amountEth > 0, "No swap available");
        if (amountSpaceCoin > 0) {
            uint256 denominator = spaceCoinReserves + amountSpaceCoin;

            uint256 amountEthOut = ethReserves - (k / denominator); // Reversed from the elegant function so that amountEthOut is positive

            (bool sent, ) = _to.call{ value: amountEthOut }("");
            amountSwapped = amountEthOut;

            require(sent, "ETH FAILED TO SEND");
        } else if (amountEth > 0) {
            uint256 denominator = ethReserves + amountEth;

            uint256 amountSpaceCoinOut = spaceCoinReserves - (k / denominator); // Reversed from the elegant function so that amountSpaceCoinOut is positive

            bool sent = SpaceCoin(spaceCoinAddress).transfer(_to, amountSpaceCoinOut);
            amountSwapped = amountSpaceCoinOut;
            require(sent, "space coin transfer failed");
        }
        updateReserves();
    }

    // Same implementation as UNISWAP V2
    function sqrt(uint256 x) public pure returns (uint256) {
        if (x == 0) return 0;
        // this block is equivalent to r = uint256(1) << (BitMath.mostSignificantBit(x) / 2);
        // however that code costs significantly more gas
        uint256 xx = x;
        uint256 r = 1;
        if (xx >= 0x100000000000000000000000000000000) {
            xx >>= 128;
            r <<= 64;
        }
        if (xx >= 0x10000000000000000) {
            xx >>= 64;
            r <<= 32;
        }
        if (xx >= 0x100000000) {
            xx >>= 32;
            r <<= 16;
        }
        if (xx >= 0x10000) {
            xx >>= 16;
            r <<= 8;
        }
        if (xx >= 0x100) {
            xx >>= 8;
            r <<= 4;
        }
        if (xx >= 0x10) {
            xx >>= 4;
            r <<= 2;
        }
        if (xx >= 0x8) {
            r <<= 1;
        }
        r = (r + x / r) >> 1;
        r = (r + x / r) >> 1;
        r = (r + x / r) >> 1;
        r = (r + x / r) >> 1;
        r = (r + x / r) >> 1;
        r = (r + x / r) >> 1;
        r = (r + x / r) >> 1; // Seven iterations should be enough
        uint256 r1 = x / r;
        return (r < r1 ? r : r1);
    }

    fallback() external payable {}
}
