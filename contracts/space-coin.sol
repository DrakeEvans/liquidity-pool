// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "hardhat/console.sol";

contract SpaceCoin is Ownable, ERC20, ERC20Capped, ERC20Pausable {
    mapping(address => uint256) public balances;
    bool public reinvestmentTax;
    address public treasuryAddress;

    constructor(uint256 initialSupply) Ownable() ERC20("Space", "SPC") ERC20Capped(initialSupply) ERC20Pausable() {
        ERC20._mint(msg.sender, initialSupply);
        treasuryAddress = msg.sender;
        reinvestmentTax = false;
    }

    function _mint(address _account, uint256 _amount) internal virtual override(ERC20, ERC20Capped) {
        super._mint(_account, _amount);
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    function startReinvestment() public onlyOwner {
        require(reinvestmentTax == false, "Reinvestment tax already started");
        reinvestmentTax = true;
    }

    function endReinvestment() public onlyOwner {
        require(reinvestmentTax == true, "Reinvestment tax already off");
        reinvestmentTax = false;
    }

    function transfer(address _account, uint256 _amount) public override returns (bool) {
        if (reinvestmentTax) {
            uint256 _tax = _amount / 50;
            super.transfer(treasuryAddress, _tax);
            return super.transfer(_account, _amount - _tax);
        } else {
            return super.transfer(_account, _amount);
        }
    }

    function transferFrom(
        address _sender,
        address _recipient,
        uint256 _amount
    ) public override returns (bool) {
        if (reinvestmentTax) {
            uint256 _tax = _amount / 50;
            bool _sent = super.transferFrom(_sender, treasuryAddress, _tax);
            require(_sent, "Unable to transfer to treasury");
            return super.transferFrom(_sender, _recipient, _amount - _tax);
        } else {
            return super.transferFrom(_sender, _recipient, _amount);
        }
    }

    function unpause() public onlyOwner {
        super._unpause();
    }

    function pause() public onlyOwner {
        super._pause();
    }

    function setTreasuryAddress(address _address) external onlyOwner {
        treasuryAddress = _address;
    }
}
