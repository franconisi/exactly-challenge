const { expect } = require("chai");
const { ethers } = require("hardhat");

const etherToWei = eth => ethers.utils.parseEther(eth.toString());
const gasUsed = tx => tx.gasUsed.mul(tx.effectiveGasPrice);

describe("ETHPool tests", () => {
    let ethPool;
    let deployer, user2, user3;

    const one_hundred_ether = etherToWei(100);

    beforeEach(async () => {
        const EthPool = await ethers.getContractFactory('ETHPool');
        ethPool = await EthPool.deploy();
        [ deployer, user2, user3 ] = await ethers.getSigners();
    });

    it("Should verify that contract owner is deployer", async () => {
        expect(
            await ethPool.owner()
        ).to.equal(deployer.address);
    });

    it("Should allow user2 to deposit correctly", async () => {
        const userInitialBalance = await user2.getBalance();
        const tx = await (await ethPool.connect(user2).deposit({ value: one_hundred_ether })).wait();
        // Verify user2 balance
        expect(
            await user2.getBalance()
        ).to.equal(userInitialBalance.sub(one_hundred_ether).sub(gasUsed(tx)));
    });

    it("Should revert trying to deposit twice", async () => {
        await ethPool.connect(user2).deposit({ value: one_hundred_ether });
        await expect(
            ethPool.connect(user2).deposit({ value: one_hundred_ether })
        ).to.be.revertedWith("You have to withdraw before deposit again");
    });

    it("Should revert trying to deposit rewards without ether in pool", async () => {
        await expect(
            ethPool.depositRewards({ value: etherToWei(50) })
        ).to.be.revertedWith("There are no deposits from users");
    });

    it("Should allow team to deposit rewards correctly", async () => {
        // Deposit 100 ether to the pool
        await ethPool.connect(user2).deposit({ value: one_hundred_ether });
        // Deposit 50 ether as rewards
        await ethPool.depositRewards({ value: etherToWei(50) });
        // Verify that contract balance is 150 ether
        expect(
            await ethPool.getBalance()
        ).to.equal(etherToWei(150));
    });

    it("Should allow user2 to withdraw deposit and all rewards", async () => {
        const initialUser2Balance = await user2.getBalance();
        // Deposit 100 ether to the pool
        const tx1 = await (await ethPool.connect(user2).deposit({ value: one_hundred_ether })).wait();
        // Deposit 50 ether as rewards
        await ethPool.depositRewards({ value: etherToWei(50) });
        // Withdraw deposit and all rewards
        const tx2 = await (await ethPool.connect(user2).withdraw()).wait();
        // Verify that contract balance is 0 ether
        expect(
            await ethPool.getBalance()
        ).to.equal(0);
        // Verify that user2 received its deposit and all rewards (150 ether)
        const gasConsumed = gasUsed(tx1).add(gasUsed(tx2));
        expect(
            await user2.getBalance()
        ).to.equal(
            initialUser2Balance.sub(one_hundred_ether).sub(gasConsumed).add(etherToWei(150))
        );
    });

    it("Should allow user2 and user3 withdraw correctly (challenge case A)", async () => {
        const initialUser2Balance = await user2.getBalance();
        const initialUser3Balance = await user3.getBalance();
        // User2 deposits 100 ether to the pool
        const txD1 = await (await ethPool.connect(user2).deposit({ value: one_hundred_ether })).wait();
        // User3 deposits 300 ether to the pool
        const txD2 = await (await ethPool.connect(user3).deposit({ value: etherToWei(300) })).wait();
        // Verify that contract balance is 400 ether
        expect(
            await ethPool.getBalance()
        ).to.equal(etherToWei(400));
        // Deposit 200 ether as rewards
        await ethPool.depositRewards({ value: etherToWei(200) });

        // User2 withdraws deposit and rewards
        const txW1 = await (await ethPool.connect(user2).withdraw()).wait();
        // User3 withdraws deposit and rewards
        const txW2 = await (await ethPool.connect(user3).withdraw()).wait();
        // Verify that contract balance is 0 ether
        expect(
            await ethPool.getBalance()
        ).to.equal(0);

        // Verify that user2 receives its deposit and rewards (total 150 ether)
        const gasConsumed2 = gasUsed(txD1).add(gasUsed(txW1));
        expect(
            await user2.getBalance()
        ).to.equal(
            initialUser2Balance.sub(one_hundred_ether).sub(gasConsumed2).add(etherToWei(150))
        );

        // Verify that user3 receives its deposit and rewards (total 450 ether)
        const gasConsumed3 = gasUsed(txD2).add(gasUsed(txW2));
        expect(
            await user3.getBalance()
        ).to.equal(
            initialUser3Balance.sub(etherToWei(300)).sub(gasConsumed3).add(etherToWei(450))
        );
    });

    it("Should withdraw correctly (challenge case B)", async () => {
        await ethPool.connect(user2).deposit({ value: one_hundred_ether });
        await ethPool.depositRewards({ value: etherToWei(50) });
        await ethPool.connect(user3).deposit({ value: etherToWei(300) });
        // Verify that user2 receives its deposit and all rewards (150 ether)
        await expect(
            ethPool.connect(user2).withdraw()
        ).to.emit(
            ethPool, "Withdrawn"
        ).withArgs(etherToWei(150));
        // Verify that user3 receives only its deposit (300 ether)
        await expect(
            ethPool.connect(user3).withdraw()
        ).to.emit(
            ethPool, "Withdrawn"
        ).withArgs(etherToWei(300));
    });

});