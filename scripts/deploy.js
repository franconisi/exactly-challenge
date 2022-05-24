async function main() {
    const ETHPool = await ethers.getContractFactory("ETHPool");
    const ethpool = await ETHPool.deploy();
    console.log("ETH Pool address:", ethpool.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
});