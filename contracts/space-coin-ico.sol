// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./space-coin.sol";

contract SpaceCoinIco is Ownable {
    enum CurrentPhase {
        Seed,
        General,
        Open
    }

    CurrentPhase public currentPhase;
    mapping(address => bool) public whitelist;
    address[] public addressesContributed;
    mapping(address => uint256) public amountContributedByAddress;
    address public spaceCoinAddress;

    uint256 public totalContributions;

    constructor(address _spaceCoinAddress) Ownable() {
        currentPhase = CurrentPhase.Seed;
        spaceCoinAddress = _spaceCoinAddress;
        whitelist[msg.sender] = true;
    }

    function updateWhitelist(address[] calldata _addresses, bool _bool) external onlyOwner {
        for (uint256 i = 0; i < _addresses.length; i++) {
            whitelist[_addresses[i]] = _bool;
        }
    }

    function movePhaseForward() external onlyOwner {
        require(currentPhase != CurrentPhase.Open, "Already in final Phase");
        if (currentPhase == CurrentPhase.Seed) {
            currentPhase = CurrentPhase.General;
        } else if (currentPhase == CurrentPhase.General) {
            currentPhase = CurrentPhase.Open;
            for (uint256 i = 0; i < addressesContributed.length; i++) {
                address recipient = addressesContributed[i];
                uint256 amount = amountContributedByAddress[recipient];

                bool sent = SpaceCoin(spaceCoinAddress).transferFrom(owner(), recipient, 5 * amount);
                require(sent, "Unable to make transfer");
            }
        }
    }

    function purchaseSpaceCoin() external payable {
        require(totalContributions + msg.value <= 15000 ether, "Total contributions cannot exceed 15000 ether");
        if (currentPhase == CurrentPhase.Seed) {
            require(msg.value < 1500 ether, "Limit of 1500 ether");
            require(whitelist[msg.sender], "Caller not on whitelist");
            _purchase();
        }
        if (currentPhase == CurrentPhase.General) {
            require(msg.value < 1000 ether, "Limit of 1500 ether");
            _purchase();
        }
        if (currentPhase == CurrentPhase.Open) {
            _purchase();
            bool _sent = SpaceCoin(spaceCoinAddress).transfer(msg.sender, 5 * msg.value);
            require(_sent, "Unable to make transfer");
        }
    }

    function _purchase() internal {
        if (amountContributedByAddress[msg.sender] == 0) {
            addressesContributed.push(msg.sender);
        }
        totalContributions += msg.value;
        amountContributedByAddress[msg.sender] += msg.value;
    }
}
