// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "hardhat/console.sol";
import "./space-coin-eth-pair.sol";
import "./space-coin.sol";

contract SpaceCoinRouter is Ownable {
    address payable public spaceCoinEthPairAddress;
    address payable public spaceCoinAddress;

    modifier notExpired(uint256 deadline) {
        require(deadline >= block.timestamp, "EXPIRED");
        _;
    }

    constructor(address _spaceCoinAddress, address _spaceCoinEthPairAddress) Ownable() {
        spaceCoinEthPairAddress = payable(_spaceCoinEthPairAddress);
        spaceCoinAddress = payable(_spaceCoinAddress);
    }

    function addLiquidity(
        uint256 amountDesiredSpaceCoin,
        uint256 minAmountSpaceCoin,
        uint256 minAmountEth,
        address to,
        uint256 deadline
    )
        external
        payable
        notExpired(deadline)
        returns (
            uint256 amountSpaceCoin,
            uint256 amountEth,
            uint256 liquidity
        )
    {
        uint256 spaceCoinReserves = SpaceCoinEthPair(spaceCoinEthPairAddress).spaceCoinReserves();
        uint256 ethReserves = SpaceCoinEthPair(spaceCoinEthPairAddress).ethReserves();
        uint256 amountDesiredEth = msg.value;
        if (spaceCoinReserves == 0 && ethReserves == 0) {
            (amountSpaceCoin, amountEth) = (amountDesiredSpaceCoin, amountDesiredEth);
        } else {
            uint256 optimalEth = (amountDesiredSpaceCoin * ethReserves) / spaceCoinReserves;
            if (optimalEth <= amountDesiredEth) {
                require(optimalEth >= minAmountEth, "Not enough enough eth");
                (amountSpaceCoin, amountEth) = (amountDesiredSpaceCoin, optimalEth);
            } else {
                uint256 optimalSpaceCoin = (amountDesiredEth * spaceCoinReserves) / ethReserves;
                assert(optimalSpaceCoin <= amountDesiredSpaceCoin);
                require(optimalSpaceCoin >= minAmountSpaceCoin, "Not enough space coin");
                (amountSpaceCoin, amountEth) = (optimalSpaceCoin, amountDesiredEth);
            }
        }
        bool sentSpc = ERC20(spaceCoinAddress).transferFrom(msg.sender, spaceCoinEthPairAddress, amountSpaceCoin);
        require(sentSpc, "addLiquidity transfer SPC failed");
        require(amountEth > 0 && amountEth <= msg.value, "FATAL: incorrect ETH amount");
        require(amountEth <= address(this).balance, "Not enough eth in contract");
        (bool sentEth, ) = spaceCoinEthPairAddress.call{ value: amountEth }("");
        require(sentEth, "addLiquidity transfer ETH failed");
        liquidity = SpaceCoinEthPair(spaceCoinEthPairAddress).mint(to);
        uint256 leftover = msg.value - amountEth;
        if (leftover > 0) {
            (bool sent, ) = msg.sender.call{ value: leftover }("");
            require(sent, "cannot send leftover eth");
        }
    }

    function removeLiquidity(
        uint256 liquidity,
        uint256 minAmountSpaceCoin,
        uint256 minAmountEth,
        address to,
        uint256 deadline
    ) external payable notExpired(deadline) returns (uint256 amountSpaceCoin, uint256 amountEth) {
        // send liquidity to spaceCoinEthPair
        bool sentSpc = SpaceCoinEthPair(spaceCoinEthPairAddress).transferFrom(
            msg.sender,
            spaceCoinEthPairAddress,
            liquidity
        );
        require(sentSpc, "SPACE COIN ETH PAIR TRANSFER FAILED to transfer LP tokens from client to pair");
        (amountSpaceCoin, amountEth) = SpaceCoinEthPair(spaceCoinEthPairAddress).burn(to);
        require(amountSpaceCoin >= minAmountSpaceCoin, "NOT ENOUGH SPACE COIN for LP tokens");
        require(amountEth >= minAmountEth, "NOT ENOUGH ETH for LP tokens");
    }

    function swapEthForSpaceCoin(uint256 minAmountSpaceCoin, address to)
        external
        payable
        returns (uint256 amountSwapped)
    {
        (bool sent, ) = spaceCoinEthPairAddress.call{ value: msg.value }("");
        require(sent, "Eth transfer to pair failed");
        amountSwapped = SpaceCoinEthPair(spaceCoinEthPairAddress).swap(to);
        require(amountSwapped >= minAmountSpaceCoin, "SLIPPAGE TOO HIGH: NOT ENOUGH SPACE COIN");
    }

    function swapSpaceCoinForEth(
        uint256 amountSpaceCoin,
        uint256 minAmountEth,
        address to
    ) external returns (uint256 amountSwapped) {
        bool transfer = SpaceCoin(spaceCoinAddress).transferFrom(msg.sender, spaceCoinEthPairAddress, amountSpaceCoin);
        require(transfer, "space coin transfer failed");
        amountSwapped = SpaceCoinEthPair(spaceCoinEthPairAddress).swap(to);
        require(amountSwapped >= minAmountEth, "SLIPPAGE TOO HIGH: NOT ENOUGH ETH");
    }
}
