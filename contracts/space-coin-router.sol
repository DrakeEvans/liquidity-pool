// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./space-coin-weth-pair.sol";
import "./space-coin.sol";

contract SpaceCoinRouter {
    address public spaceCoinWethPairAddress;
    address public spaceCoinAddress;
    address public wethAddress;

    modifier notExpired(uint256 _deadline) {
        require(_deadline >= block.timestamp, "EXPIRED");
        _;
    }

    constructor(
        address _spaceCoinAddress,
        address _spaceCoinEthPairAddress,
        address _wethAddress
    ) {
        spaceCoinAddress = _spaceCoinAddress;
        spaceCoinWethPairAddress = _spaceCoinEthPairAddress;
        wethAddress = _wethAddress;
    }

    function addLiquidity(
        uint256 _amountDesiredSpaceCoin,
        uint256 _amountDesiredWeth,
        uint256 _minAmountSpaceCoin,
        uint256 _minAmountWeth,
        address _to,
        uint256 _deadline
    )
        external
        notExpired(_deadline)
        returns (
            uint256 _amountSpaceCoin,
            uint256 _amountWeth,
            uint256 _liquidity
        )
    {
        // Grab reserve values
        uint256 _spaceCoinReserves = SpaceCoinWethPair(spaceCoinWethPairAddress).spaceCoinReserves();
        uint256 _ethReserves = SpaceCoinWethPair(spaceCoinWethPairAddress).wethReserves();

        // Calculate the optimal ratio to prevent overpaying for liquidity
        if (_spaceCoinReserves == 0 && _ethReserves == 0) {
            (_amountSpaceCoin, _amountWeth) = (_amountDesiredSpaceCoin, _amountDesiredWeth);
        } else {
            uint256 _optimalWeth = (_amountDesiredSpaceCoin * _ethReserves) / _spaceCoinReserves;
            if (_optimalWeth <= _amountDesiredWeth) {
                require(_optimalWeth >= _minAmountWeth, "addLiquidity: minAmountWeth too large");
                (_amountSpaceCoin, _amountWeth) = (_amountDesiredSpaceCoin, _optimalWeth);
            } else {
                uint256 _optimalSpaceCoin = (_amountDesiredWeth * _spaceCoinReserves) / _ethReserves;
                require(_optimalSpaceCoin >= _minAmountSpaceCoin, "addLiquidity: minAmountSpaceCoin too large");
                (_amountSpaceCoin, _amountWeth) = (_optimalSpaceCoin, _amountDesiredWeth);
            }
        }
        // Send SpaceCoin
        bool _sentSpc = SpaceCoin(spaceCoinAddress).transferFrom(
            msg.sender,
            spaceCoinWethPairAddress,
            _amountSpaceCoin
        );
        require(_sentSpc, "addLiquidity: transferFrom SPC failed");

        // Send Weth
        bool _sentWeth = WrappedEth(wethAddress).transferFrom(msg.sender, spaceCoinWethPairAddress, _amountSpaceCoin);
        require(_sentWeth, "addLiquidity: transferFrom WETH failed");

        // Mint liquidity tokens
        _liquidity = SpaceCoinWethPair(spaceCoinWethPairAddress).mint(_to);
    }

    function removeLiquidity(
        uint256 _liquidity,
        uint256 _minAmountSpaceCoin,
        uint256 _minAmountWeth,
        address _to,
        uint256 _deadline
    ) external notExpired(_deadline) returns (uint256 _amountSpaceCoin, uint256 _amountWeth) {
        // send liqiuidity tokens _to SpaceCoinWethPair
        bool _sentSpc = SpaceCoinWethPair(spaceCoinWethPairAddress).transferFrom(
            msg.sender,
            spaceCoinWethPairAddress,
            _liquidity
        );
        require(_sentSpc, "removeLiquidity: transferFrom SPC failed");

        // Burn LP tokens
        (_amountSpaceCoin, _amountWeth) = SpaceCoinWethPair(spaceCoinWethPairAddress).burn(_to);
        require(_amountSpaceCoin >= _minAmountSpaceCoin, "removeLiquidity: _minAmountSpaceCoin too large");
        require(_amountWeth >= _minAmountWeth, "removeLiquidity: _minAmountWeth too large");
    }

    function swapWethForSpaceCoin(
        uint256 _minAmountSpaceCoin,
        uint256 _amountWeth,
        address _to
    ) external returns (uint256 amountSwapped) {
        // Send weth from caller
        bool sentWeth = WrappedEth(wethAddress).transferFrom(msg.sender, spaceCoinWethPairAddress, _amountWeth);
        require(sentWeth, "swapWethForSpaceCoin: transferFrom WETH failed");
        // Swap Weth for
        amountSwapped = SpaceCoinWethPair(spaceCoinWethPairAddress).swap(_to);
        require(amountSwapped >= _minAmountSpaceCoin, "swapWethForSpaceCoin: minAmountSpaceCoin too large");
    }

    function swapSpaceCoinForWeth(
        uint256 _amountSpaceCoin,
        uint256 _minAmountWeth,
        address _to
    ) external returns (uint256 amountSwapped) {
        bool transfer = SpaceCoin(spaceCoinAddress).transferFrom(
            msg.sender,
            spaceCoinWethPairAddress,
            _amountSpaceCoin
        );
        require(transfer, "swapSpaceCoinForWeth: transferFrom SPC failed");
        amountSwapped = SpaceCoinWethPair(spaceCoinWethPairAddress).swap(_to);
        require(amountSwapped >= _minAmountWeth, "swapSpaceCoinForWeth: minAmountWeth too large");
    }
}
