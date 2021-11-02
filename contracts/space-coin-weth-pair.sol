// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "./space-coin.sol";
import "./wrapped-eth.sol";

contract SpaceCoinWethPair is Ownable, ERC20 {
    uint256 public feePercent;
    address public spaceCoinAddress;
    address public wethAddress;
    uint256 public spaceCoinReserves;
    uint256 public wethReserves;
    bool private locked;

    // Implementation from UniswapV2
    modifier lockDuringRun() {
        require(locked == false, "Re-entrancy guard");
        locked = true;
        _;
        locked = false;
    }

    constructor(address _spaceCoinAddress, address _wethAddress) Ownable() ERC20("Space-WrappedEther", "SPC-WETH") {
        spaceCoinAddress = _spaceCoinAddress;
        wethAddress = _wethAddress;
        feePercent = 1;
    }

    function setSpaceCoinAddress(address _address) external onlyOwner {
        spaceCoinAddress = _address;
    }

    function setWethAddress(address _address) external onlyOwner {
        wethAddress = _address;
    }

    function setSwapFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent < 100, "FEE PERCENT MUST BE LESS THAN 100");
        feePercent = _feePercent;
    }

    /// @dev Updates internal reserve accounting to latest information on chain
    function updateReserves() private {
        spaceCoinReserves = SpaceCoin(spaceCoinAddress).balanceOf(address(this));
        wethReserves = WrappedEth(wethAddress).balanceOf(address(this));
    }

    /// @dev Use contract balances to determine paid amounts, implies that caller will execute inside of a
    /// transaction that adds balance prior to mint call
    function mint(address _to) external lockDuringRun returns (uint256 liquidity) {
        // Scoped variables for gas saving
        uint256 _totalSupply = totalSupply();
        uint256 _amountSpaceCoinAdded = SpaceCoin(spaceCoinAddress).balanceOf(address(this)) - spaceCoinReserves;
        uint256 _amountWethAdded = WrappedEth(wethAddress).balanceOf(address(this)) - wethReserves;

        if (_totalSupply == 0) {
            // Typically there would be a minimum liquidity here to optimize tick size
            liquidity = sqrt(_amountSpaceCoinAdded * _amountWethAdded);
        } else {
            uint256 _optimisticAmountWeth = (_amountWethAdded * _totalSupply) / wethReserves;
            uint256 _optimisticAmountSpaceCoin = (_amountSpaceCoinAdded * _totalSupply) / spaceCoinReserves;

            // Implies that mismatching the ratio of assets screws over the new LP
            liquidity = _optimisticAmountWeth < _optimisticAmountSpaceCoin
                ? _optimisticAmountWeth
                : _optimisticAmountSpaceCoin;
        }
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY");
        _mint(_to, liquidity);
        updateReserves();
    }

    function burn(address _to) external lockDuringRun returns (uint256 _amountSpaceCoin, uint256 _amountWeth) {
        // scoped vars for gas savings
        uint256 _totalSupply = totalSupply();
        uint256 _liquidityToBurn = balanceOf(address(this));

        // Determine amount of underlying assets to return for the burned LP tokens
        _amountSpaceCoin = (_liquidityToBurn * spaceCoinReserves) / _totalSupply;
        _amountWeth = (_liquidityToBurn * wethReserves) / _totalSupply;

        _burn(address(this), _liquidityToBurn);

        // Transfer assets in return for the burn
        bool _sentSPC = SpaceCoin(spaceCoinAddress).transfer(_to, _amountSpaceCoin);
        require(_sentSPC, "SPC_TRANSFER_FAILED");

        bool sentWeth = WrappedEth(wethAddress).transfer(_to, _amountSpaceCoin);
        require(sentWeth, "WETH_TRANSFER_FAILED");

        // Update internal accounting
        updateReserves();
    }

    /// @dev Elegant(ish) implementation without fees:
    ///      (asset1_t0 + asset1_delta) * (asset2_t0 + asset2_delta) = asset1_0 * asset2_0
    function swap(address _to) external lockDuringRun returns (uint256 _amountSwapped) {
        // Determine amount added for swap
        uint256 _amountSpaceCoin = SpaceCoin(spaceCoinAddress).balanceOf(address(this)) - spaceCoinReserves;
        uint256 _amountWeth = WrappedEth(wethAddress).balanceOf(address(this)) - wethReserves;

        // Determine current constant value with fee
        // This implementation returns all fees to LP token holders implicitly
        uint256 _k = (spaceCoinReserves * wethReserves * (100 + feePercent)) / 100;

        // Short circuit if no assets for swap
        require(_amountSpaceCoin > 0 || _amountWeth > 0, "No swap available");

        if (_amountSpaceCoin > 0) {
            uint256 _denominator = spaceCoinReserves + _amountSpaceCoin;

            // Reversed from the elegant function so that amountWethOut is positive
            uint256 _amountWethOut = wethReserves - (_k / _denominator);

            bool _sent = WrappedEth(wethAddress).transfer(_to, _amountWethOut);
            require(_sent, "WETH FAILED TO SEND");

            _amountSwapped = _amountWethOut;
        } else if (_amountWeth > 0) {
            uint256 _denominator = wethReserves + _amountWeth;

            // Reversed from the elegant function so that _amountSpaceCoinOut is positive
            uint256 _amountSpaceCoinOut = spaceCoinReserves - (_k / _denominator);

            bool _sent = SpaceCoin(spaceCoinAddress).transfer(_to, _amountSpaceCoinOut);
            require(_sent, "space coin transfer failed");

            _amountSwapped = _amountSpaceCoinOut;
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
}
