// SPDX-License-Identifier: UNLICENSED
pragma solidity^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract ETHPool is Ownable {

    struct Deposit {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Deposit) deposits;
    uint256 rewardsAmount;
    uint256 contractBalanceAtRewards;
    uint256 rewardsTimestamp;

    event Withdrawn(uint256 amount);

    constructor() {
        contractBalanceAtRewards = 0;
        rewardsAmount = 0;
    }

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        require(deposits[_msgSender()].amount == 0, "You have to withdraw before deposit again");
        deposits[_msgSender()] = Deposit(msg.value, block.timestamp);
    }

    function withdraw() external {
        require(deposits[_msgSender()].amount > 0, "User has not deposited yet");
        uint256 amountToWithdraw = deposits[_msgSender()].amount;
        // If user have deposited before rewards, he receives a part of them
        if (rewardsTimestamp > deposits[_msgSender()].timestamp) {
            amountToWithdraw = (
                amountToWithdraw * (contractBalanceAtRewards + rewardsAmount) / contractBalanceAtRewards
            );
        }
        // Delete user deposit since he is withdrawing
        delete deposits[_msgSender()];
        payable(_msgSender()).transfer(amountToWithdraw);
        emit Withdrawn(amountToWithdraw);
    }

    function depositRewards() external payable onlyOwner {
        require(address(this).balance - msg.value > 0, "There are no deposits from users");
        rewardsAmount = msg.value;
        contractBalanceAtRewards = address(this).balance - msg.value;
        rewardsTimestamp = block.timestamp;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}